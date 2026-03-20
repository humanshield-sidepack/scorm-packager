import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
	ensureEncoded,
	buildOutputFileName,
	getVideoHeight,
	filterApplicableResolutions
} from './encoder';
import { resolveAssets, renderExportObject } from './assets';
import type { EmitFileFunction, ResolvedAsset } from './assets';
import type { VideoParameters } from './plugin-types';
import { HASH_SLICE_LENGTH } from './plugin-types';

export interface InputContext {
	inputPath: string;
	baseName: string;
	hash: string;
	applicableResolutions: number[];
}

export interface ClientBuildDeps {
	emitFile: EmitFileFunction;
	onEmitted: (cachedPath: string, referenceId: string) => void;
	inputContextCache: Map<string, InputContext>;
}

export interface SsrBuildDeps {
	inputContextCache: Map<string, InputContext>;
	clientAssetUrls: Map<string, string>;
}

function getFileHash(filePath: string): string {
	const buffer = fs.readFileSync(filePath);
	return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, HASH_SLICE_LENGTH);
}

export function resolveInputContext(cleanId: string, parameters: VideoParameters): InputContext {
	const inputPath = path.isAbsolute(cleanId) ? cleanId : path.resolve(process.cwd(), cleanId);
	const hash = getFileHash(inputPath);
	const baseName = path.basename(cleanId, path.extname(cleanId));
	const applicableResolutions = filterApplicableResolutions(
		parameters.resolutions,
		getVideoHeight(inputPath, { ffprobeBin: parameters.ffprobeBin })
	);
	return { inputPath, baseName, hash, applicableResolutions };
}

export function handleBuildLoad(
	cleanId: string,
	parameters: VideoParameters,
	deps: ClientBuildDeps
): string {
	const inputContext = resolveInputContext(cleanId, parameters);
	deps.inputContextCache.set(cleanId, inputContext);
	const { inputPath, baseName, hash, applicableResolutions } = inputContext;
	const { formats, cacheDirectory, ffmpegBin } = parameters;
	const cachedPaths = new Map<string, string>();
	for (const format of formats) {
		for (const resolution of applicableResolutions) {
			const cachedPath = ensureEncoded(
				{ inputPath, baseName, hash, resolution, format, cacheDirectory, ffmpegBin },
				{}
			);
			cachedPaths.set(`${format}_${resolution}p`, cachedPath);
		}
	}
	const trackingEmitFile: EmitFileFunction = (emitOptions) => {
		const referenceId = deps.emitFile(emitOptions);
		const cachedPath = [...cachedPaths.values()].find((p) => path.basename(p) === emitOptions.name);
		if (cachedPath) deps.onEmitted(cachedPath, referenceId);
		return referenceId;
	};
	const assets = resolveAssets(
		cachedPaths,
		{ isBuild: true, formats, resolutions: applicableResolutions },
		trackingEmitFile
	);
	return renderExportObject(assets, formats);
}

export function handleSsrBuildLoad(
	cleanId: string,
	parameters: VideoParameters,
	deps: SsrBuildDeps
): string {
	const { formats, cacheDirectory } = parameters;
	const inputContext =
		deps.inputContextCache.get(cleanId) ?? resolveInputContext(cleanId, parameters);
	const { baseName, hash, applicableResolutions } = inputContext;
	if (deps.clientAssetUrls.size === 0)
		console.warn('[video-plugin] SSR build ran before client build — no asset URLs available');
	const assets: ResolvedAsset[] = [];
	for (const format of formats) {
		for (const resolution of applicableResolutions) {
			const fileName = buildOutputFileName({ baseName, hash, resolution, format });
			const cachedPath = path.join(path.resolve(cacheDirectory), fileName);
			const url = deps.clientAssetUrls.get(cachedPath);
			if (url) assets.push({ format, resolution, expression: JSON.stringify(url) });
		}
	}
	return renderExportObject(assets, formats);
}
