import fs from 'node:fs';
import path from 'node:path';
import type { VideoFormat } from './encoder';

export interface ResolvedAsset {
	format: VideoFormat;
	resolution: number;
	/** The JS expression to embed (a string literal or a rollup import.meta ref) */
	expression: string;
}

export interface AssetResolverOptions {
	isBuild: boolean;
	formats: VideoFormat[];
	resolutions: number[];
	readFile?: (filePath: string) => Buffer;
}

export type EmitFileFunction = (options: { type: 'asset'; name: string; source: Buffer }) => string;

/**
 * Returns the dev-mode URL for a cached file, served via the plugin's own middleware.
 */
export function developmentUrl(cachedPath: string): string {
	return `/_enhanced-video/${path.basename(cachedPath)}`;
}

/**
 * Resolves all format/resolution combinations for a single input file,
 * returning the JS expression for each (either a URL string or a rollup file ref).
 */
export function resolveAssets(
	cachedPaths: Map<string, string>,
	options: AssetResolverOptions,
	emitFile?: EmitFileFunction
): ResolvedAsset[] {
	const { isBuild, formats, resolutions, readFile = fs.readFileSync } = options;
	const assets: ResolvedAsset[] = [];

	for (const format of formats) {
		for (const resolution of resolutions) {
			const key = `${format}_${resolution}p`;
			const cachedPath = cachedPaths.get(key);
			if (!cachedPath) continue;

			if (isBuild) {
				if (!emitFile) throw new Error('emitFile required in build mode');
				const source = readFile(cachedPath);
				const fileName = path.basename(cachedPath);
				const reference = emitFile({ type: 'asset', name: fileName, source });
				assets.push({
					format,
					resolution,
					expression: `import.meta.ROLLUP_FILE_URL_${reference}`
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

export function normalizeVideoUrl(url: unknown): unknown {
	if (typeof url === 'string' && url.startsWith('file:')) {
		const index = url.indexOf('/_app/');
		return index === -1 ? url : url.slice(index);
	}
	return url;
}

const NORMALIZER_HELPER =
	'const __v=(u)=>{if(typeof u!=="string"||!u.startsWith("file:"))return u;const i=u.indexOf("/_app/");return i>=0?u.slice(i):u;};';

/**
 * Renders the resolved assets as the body of the default export object.
 * e.g.:  { "mp4": { "1080p": "/path/to/file.mp4", ... }, ... }
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
	const parts: string[] = [NORMALIZER_HELPER, 'export default {'];

	for (const format of formats) {
		const entries = assets
			.filter((a) => a.format === format)
			.map((a) => `"${a.resolution}p": __v(${a.expression})`);
		parts.push(`  ${JSON.stringify(format)}: { ${entries.join(', ')} },`);
	}

	parts.push('};');
	return parts.join('\n');
}
