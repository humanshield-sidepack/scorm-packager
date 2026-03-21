import type { Plugin, Logger, ResolvedConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { transformSvelteCode } from './transform.js';
import type { VideoFormat } from './encoder.js';
import { createDevelopmentState, setupDevelopmentServer } from './development-server.js';
import type { DevelopmentServerReference } from './development-server.js';
import { DEFAULT_RESOLUTIONS, DEFAULT_FORMATS, DEFAULT_LOCK_MAX_AGE_MS } from './plugin-types.js';
import type { VideoPluginOptions, VideoParameters, DevelopmentLoadState } from './plugin-types.js';
import { resolveBinaries } from './ffmpeg-resolver.js';
import { handleBuildLoad } from './build-load.js';
import type { InputContext, BuildDeps } from './build-load.js';
import { handleDevelopmentLoad } from './development-load.js';

export type { VideoPluginOptions } from './plugin-types.js';

interface ResolvedPluginConfig {
	formats: VideoFormat[];
	resolutions: number[];
	cacheDirectory: string;
	maxJobs: number;
	ffmpegPath: string | undefined;
	ffprobePath: string | undefined;
	lockMaxAgeMs: number;
	fps: number | undefined;
}

interface PluginBuildState {
	inputContextCache: Map<string, InputContext>;
	filesToCopy: Map<string, string>;
}

interface PluginBuildConfig {
	base: string;
	assetsDirectory: string;
	outDirectory: string;
}

interface PluginRuntimeState {
	isBuild: boolean;
	binaries: { ffmpeg: string; ffprobe: string };
	pluginLogger: Logger;
	developmentState: DevelopmentLoadState;
	buildConfig: PluginBuildConfig;
}

interface TransformContext {
	config: ResolvedPluginConfig;
	warn: (message: string) => void;
}

function resolvePluginOptions(options: VideoPluginOptions): ResolvedPluginConfig {
	return {
		resolutions: options.resolutions ?? DEFAULT_RESOLUTIONS,
		formats: options.formats ?? DEFAULT_FORMATS,
		cacheDirectory: options.cacheDirectory ?? path.resolve(process.cwd(), '.video-cache/videos'),
		maxJobs: options.maxJobs ?? Math.max(1, os.cpus().length - 1),
		ffmpegPath: options.ffmpegPath,
		ffprobePath: options.ffprobePath,
		lockMaxAgeMs: options.lockMaxAgeMs ?? DEFAULT_LOCK_MAX_AGE_MS,
		fps: options.fps
	};
}

function createBuildState(): PluginBuildState {
	return { inputContextCache: new Map(), filesToCopy: new Map() };
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
		lockMaxAgeMs: pluginConfig.lockMaxAgeMs,
		fps: pluginConfig.fps
	};
}

function isVideoModule(id: string, cleanId: string): boolean {
	return /(^|[?&])enhanced($|&)/.test(id) && /\.(mp4|mov|webm)$/.test(cleanId);
}

function transformSvelteVideo(code: string, id: string, context: TransformContext) {
	if (!id.endsWith('.svelte')) return;
	const transformed = transformSvelteCode(
		code,
		{ resolutions: context.config.resolutions, formats: context.config.formats },
		context.warn
	);
	if (!transformed) return;
	return { code: transformed.code, map: transformed.map };
}

async function initRuntimeState(
	pluginConfig: ResolvedPluginConfig,
	serverReference: DevelopmentServerReference,
	config: ResolvedConfig
): Promise<PluginRuntimeState> {
	const pluginLogger = config.logger;
	const developmentState = createDevelopmentState({
		maxJobs: pluginConfig.maxJobs,
		serverReference,
		lockMaxAgeMs: pluginConfig.lockMaxAgeMs,
		warn: pluginLogger.warn.bind(pluginLogger),
		log: pluginLogger.info.bind(pluginLogger),
		logError: (message, error) => pluginLogger.error(`${message} ${String(error)}`)
	});
	const binaries = await resolveBinaries({
		ffmpegPath: pluginConfig.ffmpegPath,
		ffprobePath: pluginConfig.ffprobePath,
		warn: pluginLogger.warn.bind(pluginLogger)
	});
	const buildConfig: PluginBuildConfig = {
		base: config.base,
		assetsDirectory: config.build.assetsDir,
		outDirectory: config.build.outDir
	};
	return {
		isBuild: config.command === 'build',
		binaries,
		pluginLogger,
		developmentState,
		buildConfig
	};
}

function buildDeps(
	buildState: PluginBuildState,
	buildConfig: PluginBuildConfig,
	logger: Logger
): BuildDeps {
	return {
		copyFile: (source, destination) => buildState.filesToCopy.set(source, destination),
		base: buildConfig.base,
		assetsDirectory: buildConfig.assetsDirectory,
		outDirectory: buildConfig.outDirectory,
		inputContextCache: buildState.inputContextCache,
		warn: logger.warn.bind(logger),
		log: logger.info.bind(logger),
		logError: (message, error) => logger.error(`${message} ${String(error)}`)
	};
}

interface VideoLoadContext {
	pluginConfig: ResolvedPluginConfig;
	buildState: PluginBuildState;
	runtime: PluginRuntimeState;
}

async function loadDevelopmentVideoModule(
	id: string,
	parameters: VideoParameters,
	developmentState: DevelopmentLoadState
): Promise<string> {
	return handleDevelopmentLoad(id, parameters, developmentState);
}

async function loadBuildVideoModule(
	cleanId: string,
	parameters: VideoParameters,
	context: Pick<VideoLoadContext, 'buildState' | 'runtime'>
): Promise<string> {
	const { buildState, runtime } = context;
	return handleBuildLoad(
		cleanId,
		parameters,
		buildDeps(buildState, runtime.buildConfig, runtime.pluginLogger)
	);
}

async function handleVideoLoad(id: string, context: VideoLoadContext): Promise<string | undefined> {
	const { pluginConfig, buildState, runtime } = context;
	const cleanId = id.split('?')[0]!;
	if (!cleanId || !isVideoModule(id, cleanId)) return undefined;
	const parameters = buildVideoParameters(pluginConfig, runtime.binaries);
	if (!runtime.isBuild) return loadDevelopmentVideoModule(id, parameters, runtime.developmentState);
	return loadBuildVideoModule(cleanId, parameters, { buildState, runtime });
}

export default function enhancedVideo(options: VideoPluginOptions = {}): Plugin {
	const pluginConfig = resolvePluginOptions(options);
	const serverReference: DevelopmentServerReference = {};
	const buildState = createBuildState();
	let runtime!: PluginRuntimeState;
	return {
		name: 'vite-enhanced-video-plugin',
		enforce: 'pre',
		configureServer(server) {
			serverReference.current = server;
			return setupDevelopmentServer(server, pluginConfig.cacheDirectory, runtime.developmentState);
		},
		async configResolved(config) {
			runtime = await initRuntimeState(pluginConfig, serverReference, config);
		},
		transform(code, id) {
			return transformSvelteVideo(code, id, {
				config: pluginConfig,
				warn: (message) => this.warn(message)
			});
		},
		async load(id) {
			return handleVideoLoad(id, { pluginConfig, buildState, runtime });
		},
		writeBundle() {
			for (const [source, destination] of buildState.filesToCopy) {
				fs.mkdirSync(path.dirname(destination), { recursive: true });
				fs.copyFileSync(source, destination);
			}
		}
	};
}
