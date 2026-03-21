import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getVideoInfo, filterApplicableResolutions } from './encoder.js';
import { ensureEncoded } from './development-encoder.js';
import { resolveAssets, renderExportObject } from './assets.js';
import { buildEnsureEncodedOptions } from './encode-options.js';
import type { VideoParameters } from './plugin-types.js';
import { HASH_SLICE_LENGTH } from './plugin-types.js';

export interface InputContext {
	inputPath: string;
	baseName: string;
	hash: string;
	applicableResolutions: number[];
	sourceFps: number;
}

export interface BuildDeps {
	copyFile: (source: string, destination: string) => void;
	base: string;
	assetsDirectory: string;
	outDirectory: string;
	inputContextCache: Map<string, InputContext>;
	warn: (message: string) => void;
	log: (message: string) => void;
	logError: (message: string, error: unknown) => void;
}

/**
 * Returns a fast cache fingerprint for a video file using mtime + size + fps cap.
 * Avoids reading file content (which can be GBs) while still detecting
 * file replacement reliably. Including fps ensures a changed fps option
 * produces a different cache key and triggers a fresh encode.
 */
function computeFileFingerprint(filePath: string, fps?: number): string {
	const stat = fs.statSync(filePath);
	return crypto
		.createHash('sha256')
		.update(`${stat.mtimeMs}:${stat.size}:${fps ?? ''}`)
		.digest('hex')
		.slice(0, HASH_SLICE_LENGTH);
}

export function resolveInputContext(
	cleanId: string,
	parameters: VideoParameters,
	warn?: (message: string) => void
): InputContext {
	const inputPath = path.isAbsolute(cleanId) ? cleanId : path.resolve(process.cwd(), cleanId);
	const hash = computeFileFingerprint(inputPath, parameters.fps);
	const baseName = path.basename(cleanId, path.extname(cleanId));
	const probeDeps = { ffprobeBin: parameters.ffprobeBin };
	const videoInfo = getVideoInfo(inputPath, probeDeps);
	const applicableResolutions = filterApplicableResolutions(
		parameters.resolutions,
		videoInfo.height
	);
	if (applicableResolutions.length === 0) {
		warn?.(
			`[svelte-enhanced-video] "${baseName}" source resolution is smaller than all configured ` +
				`resolutions (${parameters.resolutions.join(', ')}p) — no <source> elements will be generated.`
		);
	}
	const sourceFps = videoInfo.fps;
	return { inputPath, baseName, hash, applicableResolutions, sourceFps };
}

export async function handleBuildLoad(
	cleanId: string,
	parameters: VideoParameters,
	deps: BuildDeps
): Promise<string> {
	const cached = deps.inputContextCache.get(cleanId);
	const inputContext = cached ?? resolveInputContext(cleanId, parameters, deps.warn);
	if (!cached) deps.inputContextCache.set(cleanId, inputContext);
	const { inputPath, baseName, hash, applicableResolutions, sourceFps } = inputContext;
	const { formats, cacheDirectory, ffmpegBin, fps } = parameters;
	const cachedPaths = new Map<string, string>();
	for (const format of formats) {
		for (const resolution of applicableResolutions) {
			const cachedPath = await ensureEncoded(
				buildEnsureEncodedOptions({
					context: { inputPath, baseName, hash, sourceFps },
					parameters: { cacheDirectory, ffmpegBin, fps },
					format,
					resolution
				}),
				{ log: deps.log, logError: deps.logError, throwOnError: true }
			);
			cachedPaths.set(`${format}_${resolution}p`, cachedPath);
		}
	}

	for (const cachedPath of cachedPaths.values()) {
		const fileName = path.basename(cachedPath);
		deps.copyFile(cachedPath, path.join(deps.outDirectory, deps.assetsDirectory, fileName));
	}

	const assets = resolveAssets(cachedPaths, {
		isBuild: true,
		formats,
		resolutions: applicableResolutions,
		base: deps.base,
		assetsDirectory: deps.assetsDirectory
	});
	return renderExportObject(assets, formats);
}
