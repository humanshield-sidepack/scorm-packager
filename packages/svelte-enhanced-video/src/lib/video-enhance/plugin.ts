import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { transformSvelteCode } from './transform';
import { getLockFilePath, buildOutputFileName } from './encoder';
import type { EnsureEncodedOptions, VideoFormat } from './encoder';
import { ensureEncodedAsync, isLockStale, cleanStaleLock } from './encoder-lock';
import { resolveAssets, renderExportObject, renderFallbackModule } from './assets';
import type { EmitFileFunction } from './assets';
import { createDevelopmentState, setupDevelopmentServer } from './development-server';
import type { DevelopmentServerReference } from './development-server';
import { DEFAULT_RESOLUTIONS, DEFAULT_FORMATS, DEFAULT_LOCK_MAX_AGE_MS } from './plugin-types';
import type { VideoPluginOptions, VideoParameters, DevelopmentLoadState } from './plugin-types';
import { resolveBinaries } from './ffmpeg-resolver';
import { resolveInputContext, handleBuildLoad, handleSsrBuildLoad } from './build-load';
import type { InputContext, ClientBuildDeps } from './build-load';

export type { VideoPluginOptions } from './plugin-types';

interface ResolvedPluginConfig {
	formats: VideoFormat[];
	resolutions: number[];
	cacheDirectory: string;
	maxJobs: number;
	ffmpegPath: string | undefined;
	ffprobePath: string | undefined;
	lockMaxAgeMs: number;
}

interface PluginBuildState {
	clientReferences: Map<string, string>;
	clientAssetUrls: Map<string, string>;
	inputContextCache: Map<string, InputContext>;
}

interface MissingEncodingsContext {
	formats: VideoFormat[];
	applicableResolutions: number[];
	baseName: string;
	hash: string;
	resolvedCacheDirectory: string;
	inputPath: string;
	ffmpegBin: string;
}

function resolvePluginOptions(options: VideoPluginOptions): ResolvedPluginConfig {
	return {
		resolutions: options.resolutions ?? DEFAULT_RESOLUTIONS,
		formats: options.formats ?? DEFAULT_FORMATS,
		cacheDirectory: options.cacheDirectory ?? path.resolve(process.cwd(), '.video-cache/videos'),
		maxJobs: options.maxJobs ?? Math.max(1, os.cpus().length - 1),
		ffmpegPath: options.ffmpegPath,
		ffprobePath: options.ffprobePath,
		lockMaxAgeMs: options.lockMaxAgeMs ?? DEFAULT_LOCK_MAX_AGE_MS
	};
}

function createBuildState(): PluginBuildState {
	return {
		clientReferences: new Map(),
		clientAssetUrls: new Map(),
		inputContextCache: new Map()
	};
}

function buildVideoParameters(
	pluginConfig: ResolvedPluginConfig,
	binaries: { ffmpeg: string; ffprobe: string }
): VideoParameters {
	return {
		formats: pluginConfig.formats,
		resolutions: pluginConfig.resolutions,
		cacheDirectory: pluginConfig.cacheDirectory,
		ffmpegBin: binaries.ffmpeg,
		ffprobeBin: binaries.ffprobe,
		lockMaxAgeMs: pluginConfig.lockMaxAgeMs
	};
}

function isVideoModule(id: string, cleanId: string): boolean {
	return /(^|[?&])enhanced($|&)/.test(id) && /\.(mp4|mov|webm)$/.test(cleanId);
}

function scheduleEncoding(
	cachedPath: string,
	encodeOptions: EnsureEncodedOptions,
	state: DevelopmentLoadState
): void {
	const lockPath = getLockFilePath(cachedPath);
	const lockExists = fs.existsSync(lockPath);
	if (lockExists && !isLockStale(lockPath, state.lockMaxAgeMs)) {
		state.watchedPaths.set(cachedPath, encodeOptions);
		return;
	}
	if (lockExists) {
		cleanStaleLock(lockPath, cachedPath);
	}
	if (!state.inFlightPaths.has(cachedPath)) {
		state.inFlightPaths.add(cachedPath);
		state.encodingQueue.enqueue(async () => {
			await ensureEncodedAsync(encodeOptions, { lockMaxAgeMs: state.lockMaxAgeMs });
			state.inFlightPaths.delete(cachedPath);
		});
	}
}

function scheduleMissingEncodings(
	context: MissingEncodingsContext,
	cachedPaths: Map<string, string>,
	state: DevelopmentLoadState
): boolean {
	const {
		formats,
		applicableResolutions,
		baseName,
		hash,
		resolvedCacheDirectory,
		inputPath,
		ffmpegBin
	} = context;
	let hasUncached = false;
	for (const format of formats) {
		for (const resolution of applicableResolutions) {
			const fileName = buildOutputFileName({ baseName, hash, resolution, format });
			const cachedPath = path.join(resolvedCacheDirectory, fileName);
			cachedPaths.set(`${format}_${resolution}p`, cachedPath);
			const lockPath = getLockFilePath(cachedPath);
			if (!fs.existsSync(cachedPath) || fs.existsSync(lockPath)) {
				hasUncached = true;
				scheduleEncoding(
					cachedPath,
					{
						inputPath,
						baseName,
						hash,
						resolution,
						format,
						cacheDirectory: resolvedCacheDirectory,
						ffmpegBin
					},
					state
				);
			}
		}
	}
	return hasUncached;
}

async function handleDevelopmentLoad(
	id: string,
	parameters: VideoParameters,
	state: DevelopmentLoadState
): Promise<string> {
	const cleanId = id.split('?')[0]!;
	const { inputPath, baseName, hash, applicableResolutions } = resolveInputContext(
		cleanId,
		parameters
	);
	const { formats, cacheDirectory, ffmpegBin } = parameters;
	const resolvedCacheDirectory = path.resolve(cacheDirectory);
	fs.mkdirSync(resolvedCacheDirectory, { recursive: true });
	const cachedPaths = new Map<string, string>();
	const hasUncached = scheduleMissingEncodings(
		{
			formats,
			applicableResolutions,
			baseName,
			hash,
			resolvedCacheDirectory,
			inputPath,
			ffmpegBin
		},
		cachedPaths,
		state
	);
	if (!hasUncached) {
		return renderExportObject(
			resolveAssets(cachedPaths, { isBuild: false, formats, resolutions: applicableResolutions }),
			formats
		);
	}
	state.pendingModuleIds.add(id);
	const originalExtension = path.extname(inputPath).slice(1);
	const originalFileName = `${baseName}_${hash}_original.${originalExtension}`;
	state.originalFiles.set(originalFileName, inputPath);
	return renderFallbackModule(originalFileName, formats, applicableResolutions);
}

function transformSvelteVideo(code: string, id: string, pluginConfig: ResolvedPluginConfig) {
	if (!id.endsWith('.svelte')) return;
	const transformed = transformSvelteCode(code, {
		resolutions: pluginConfig.resolutions,
		formats: pluginConfig.formats
	});
	if (!transformed) return;
	return { code: transformed.code, map: transformed.map };
}

export default function enhancedVideo(options: VideoPluginOptions = {}): Plugin {
	const pluginConfig = resolvePluginOptions(options);
	let isBuild = false;
	let binaries = { ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' };
	const serverReference: DevelopmentServerReference = {};
	const developmentState = createDevelopmentState(
		pluginConfig.maxJobs,
		serverReference,
		pluginConfig.lockMaxAgeMs
	);
	const buildState = createBuildState();
	return {
		name: 'vite-enhanced-video-plugin',
		enforce: 'pre',
		configureServer(server) {
			serverReference.current = server;
			return setupDevelopmentServer(server, pluginConfig.cacheDirectory, developmentState);
		},
		async configResolved(config) {
			isBuild = config.command === 'build';
			binaries = await resolveBinaries({
				ffmpegPath: pluginConfig.ffmpegPath,
				ffprobePath: pluginConfig.ffprobePath
			});
		},
		transform(code, id) {
			return transformSvelteVideo(code, id, pluginConfig);
		},
		generateBundle() {
			if (buildState.clientAssetUrls.size > 0) return;
			for (const [cachedPath, referenceId] of buildState.clientReferences)
				buildState.clientAssetUrls.set(cachedPath, `/${this.getFileName(referenceId)}`);
		},
		async load(id, options) {
			const context = this as unknown as { emitFile: EmitFileFunction };
			const cleanId = id.split('?')[0]!;
			if (!cleanId || !isVideoModule(id, cleanId)) return;
			const parameters = buildVideoParameters(pluginConfig, binaries);
			if (!isBuild) return handleDevelopmentLoad(id, parameters, developmentState);
			if (options?.ssr) return handleSsrBuildLoad(cleanId, parameters, buildState);
			const clientBuildDeps: ClientBuildDeps = {
				emitFile: context.emitFile,
				onEmitted: (cachedPath, referenceId) =>
					buildState.clientReferences.set(cachedPath, referenceId),
				inputContextCache: buildState.inputContextCache
			};
			return handleBuildLoad(cleanId, parameters, clientBuildDeps);
		}
	};
}
