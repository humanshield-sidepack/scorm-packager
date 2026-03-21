import path from 'node:path';
import type { VideoFormat } from './encoder.js';

export interface ResolvedAsset {
	format: VideoFormat;
	resolution: number;
	/** The JS expression to embed (a JSON string literal containing the web URL) */
	expression: string;
}

export interface AssetResolverOptions {
	isBuild: boolean;
	formats: VideoFormat[];
	resolutions: number[];
	/** Vite's `config.base` — prepended to the asset URL in build mode. Default: '/'. */
	base?: string;
	/** Vite's `config.build.assetsDirectory` — the assets sub-directory in build mode. Default: 'assets'. */
	assetsDirectory?: string;
}

const DEFAULT_BASE = '/';
const DEFAULT_ASSETS_DIR = 'assets';

function normalizeBase(base: string): string {
	const trimmed = base.trim();
	if (trimmed === '') return '/';
	if (trimmed === '/') return '/';
	return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function normalizeAssetsDirectory(assetsDirectory: string): string {
	const trimmed = assetsDirectory.trim();
	let start = 0;
	let end = trimmed.length;
	while (start < end && trimmed[start] === '/') start++;
	while (end > start && trimmed[end - 1] === '/') end--;
	return trimmed.slice(start, end);
}

function buildAssetWebUrl(base: string, assetsDirectory: string, fileName: string): string {
	const normalizedBase = normalizeBase(base);
	const normalizedAssetsDirectory = normalizeAssetsDirectory(assetsDirectory);
	if (normalizedAssetsDirectory === '') {
		return `${normalizedBase}${fileName}`;
	}
	return `${normalizedBase}${normalizedAssetsDirectory}/${fileName}`;
}

/**
 * Returns the dev-mode URL for a cached file, served via the plugin's own middleware.
 */
export function developmentUrl(cachedPath: string): string {
	return `/_enhanced-video/${path.basename(cachedPath)}`;
}

/**
 * Resolves all format/resolution combinations for a single input file,
 * returning the JS expression for each.
 *
 * Build mode: computes a static web URL (`base + assetsDirectory + '/' + fileName`)
 * so the encoded video files can be copied directly to the output directory
 * without reading them into memory via Rollup's emitFile API.
 *
 * Dev mode: returns a `/_enhanced-video/` middleware URL.
 */
export function resolveAssets(
	cachedPaths: Map<string, string>,
	options: AssetResolverOptions
): ResolvedAsset[] {
	const {
		isBuild,
		formats,
		resolutions,
		base = DEFAULT_BASE,
		assetsDirectory = DEFAULT_ASSETS_DIR
	} = options;
	const assets: ResolvedAsset[] = [];

	for (const format of formats) {
		for (const resolution of resolutions) {
			const key = `${format}_${resolution}p`;
			const cachedPath = cachedPaths.get(key);
			if (!cachedPath) continue;

			if (isBuild) {
				const fileName = path.basename(cachedPath);
				assets.push({
					format,
					resolution,
					expression: JSON.stringify(buildAssetWebUrl(base, assetsDirectory, fileName))
				});
			} else {
				assets.push({
					format,
					resolution,
					expression: JSON.stringify(developmentUrl(cachedPath))
				});
			}
		}
	}

	return assets;
}

/**
 * Renders a fallback module used while background encoding is in progress.
 * All format/resolution slots point to the original (unencoded) video served
 * via the plugin's middleware, so the browser can play the video immediately
 * without waiting for encoding to complete. Replaced on the next hot reload
 * once encoding finishes.
 */
export function renderFallbackModule(
	originalFileName: string,
	formats: VideoFormat[],
	resolutions: number[]
): string {
	const originalUrl = JSON.stringify(`/_enhanced-video/${originalFileName}`);
	const parts: string[] = ['export default {'];
	for (const format of formats) {
		const entries = resolutions.map((resolution) => `"${resolution}p": ${originalUrl}`);
		parts.push(`  ${JSON.stringify(format)}: { ${entries.join(', ')} },`);
	}
	parts.push('};');
	return parts.join('\n');
}

export function renderExportObject(assets: ResolvedAsset[], formats: VideoFormat[]): string {
	const parts: string[] = ['export default {'];

	for (const format of formats) {
		const entries = assets
			.filter((a) => a.format === format)
			.map((a) => `"${a.resolution}p": ${a.expression}`);
		parts.push(`  ${JSON.stringify(format)}: { ${entries.join(', ')} },`);
	}

	parts.push('};');
	return parts.join('\n');
}
