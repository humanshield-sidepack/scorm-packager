import fs from 'node:fs';
import path from 'node:path';
import { buildOutputFileName } from './encoder';
import type { EnsureEncodedOptions, VideoFormat } from './encoder';
import { ensureEncoded } from './development-encoder';
import { getLockFilePath, isCached, isLockStale, cleanStaleLock } from './lock';
import { resolveAssets, renderExportObject, renderFallbackModule } from './assets';
import { resolveInputContext } from './build-load';
import { buildEnsureEncodedOptions } from './encode-options';
import type { VideoParameters, DevelopmentLoadState } from './plugin-types';

interface MissingEncodingsContext {
	formats: VideoFormat[];
	applicableResolutions: number[];
	baseName: string;
	hash: string;
	resolvedCacheDirectory: string;
	inputPath: string;
	ffmpegBin: string;
	sourceFps: number;
	fps: number | undefined;
}

function scheduleEncoding(
	cachedPath: string,
	encodeOptions: EnsureEncodedOptions,
	state: DevelopmentLoadState
): void {
	if (state.pathStates.get(cachedPath)?.phase === 'encoding') return;

	const lockPath = getLockFilePath(cachedPath);
	const lockExists = fs.existsSync(lockPath);
	if (lockExists && !isLockStale(lockPath, state.lockMaxAgeMs)) {
		state.pathStates.set(cachedPath, { phase: 'waiting', encodeOptions });
		return;
	}
	if (lockExists) {
		cleanStaleLock(lockPath, cachedPath);
	}

	state.pathStates.set(cachedPath, { phase: 'encoding', encodeOptions });
	state.encodingQueue.enqueue(async () => {
		await ensureEncoded(encodeOptions, {
			lockMaxAgeMs: state.lockMaxAgeMs,
			log: state.log,
			logError: state.logError
		});
		state.pathStates.set(cachedPath, { phase: 'waiting', encodeOptions });
	});
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
		ffmpegBin,
		sourceFps,
		fps
	} = context;
	let hasUncached = false;
	for (const format of formats) {
		for (const resolution of applicableResolutions) {
			const fileName = buildOutputFileName({ baseName, hash, resolution, format });
			const cachedPath = path.join(resolvedCacheDirectory, fileName);
			cachedPaths.set(`${format}_${resolution}p`, cachedPath);
			const lockPath = getLockFilePath(cachedPath);
			if (!isCached(cachedPath, lockPath)) {
				hasUncached = true;
				scheduleEncoding(
					cachedPath,
					buildEnsureEncodedOptions({
						context: { inputPath, baseName, hash, sourceFps },
						parameters: { cacheDirectory: resolvedCacheDirectory, ffmpegBin, fps },
						format,
						resolution
					}),
					state
				);
			}
		}
	}
	return hasUncached;
}

function warnOnceAboutEncoding(state: DevelopmentLoadState): void {
	if (state.hasWarnedAboutEncoding) return;
	state.hasWarnedAboutEncoding = true;
	state.warn(
		'[video-plugin] hint: videos are being encoded in the background during dev.\n' +
			'  For a better experience and production-like behavior, run a build first\n' +
			'  to populate the video cache (vite build), then start the dev server.\n' +
			'  Video encoding is CPU-intensive and will slow down hot reloads.'
	);
}

export async function handleDevelopmentLoad(
	id: string,
	parameters: VideoParameters,
	state: DevelopmentLoadState
): Promise<string> {
	const cleanId = id.split('?')[0]!;
	const { inputPath, baseName, hash, applicableResolutions, sourceFps } = resolveInputContext(
		cleanId,
		parameters,
		state.warn
	);
	const { formats, cacheDirectory, ffmpegBin, fps } = parameters;
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
			ffmpegBin,
			sourceFps,
			fps
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
	warnOnceAboutEncoding(state);
	state.pendingModuleIds.add(id);
	const originalExtension = path.extname(inputPath).slice(1);
	const originalFileName = `${baseName}_${hash}_original.${originalExtension}`;
	state.originalFiles.set(originalFileName, inputPath);
	return renderFallbackModule(originalFileName, formats, applicableResolutions);
}
