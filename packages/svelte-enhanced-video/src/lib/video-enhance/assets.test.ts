import { describe, it, expect, vi } from 'vitest';
import type { VideoFormat } from './encoder';
import { developmentUrl, normalizeVideoUrl, resolveAssets, renderExportObject } from './assets';

const RESOLUTION_HIGH = 1080;
const RESOLUTION_LOW = 720;
const FORMATS: VideoFormat[] = ['mp4', 'webm'];
const RESOLUTIONS = [RESOLUTION_HIGH, RESOLUTION_LOW];

function makeCachedPaths(): Map<string, string> {
	return new Map([
		['mp4_1080p', '/cache/video_abc_1080p.mp4'],
		['mp4_720p', '/cache/video_abc_720p.mp4'],
		['webm_1080p', '/cache/video_abc_1080p.webm'],
		['webm_720p', '/cache/video_abc_720p.webm']
	]);
}

describe('developmentUrl', () => {
	it('prefixes with /_enhanced-video/ and uses only the filename', () => {
		expect(developmentUrl('/cache/video.mp4')).toBe('/_enhanced-video/video.mp4');
	});

	it.skipIf(process.platform !== 'win32')('uses only the basename on Windows paths', () => {
		expect(developmentUrl(String.raw`C:\cache\video.mp4`)).toBe('/_enhanced-video/video.mp4');
	});
});

describe('resolveAssets (dev)', () => {
	const baseOptions = {
		isBuild: false,
		formats: FORMATS,
		resolutions: RESOLUTIONS
	};

	it('returns one asset per format × resolution', () => {
		const assets = resolveAssets(makeCachedPaths(), baseOptions);
		expect(assets).toHaveLength(FORMATS.length * RESOLUTIONS.length);
	});

	it('produces JSON-string expressions in dev mode', () => {
		const assets = resolveAssets(makeCachedPaths(), baseOptions);
		for (const asset of assets) {
			expect(asset.expression).toMatch(/^"/);
		}
	});

	it('embeds the /_enhanced-video/ URL in the expression', () => {
		const assets = resolveAssets(makeCachedPaths(), baseOptions);
		const mp4High = assets.find((a) => a.format === 'mp4' && a.resolution === RESOLUTION_HIGH)!;
		expect(mp4High.expression).toContain('/_enhanced-video/');
	});

	it('skips missing cache entries gracefully', () => {
		const partial = new Map([['mp4_1080p', '/cache/video_abc_1080p.mp4']]);
		const assets = resolveAssets(partial, baseOptions);
		expect(assets).toHaveLength(1);
	});
});

describe('resolveAssets (build)', () => {
	const buildOptions = {
		isBuild: true,
		formats: FORMATS,
		resolutions: RESOLUTIONS,
		readFile: vi.fn().mockReturnValue(Buffer.from('data')) as unknown as (p: string) => Buffer
	};

	it('calls emitFile for every asset', () => {
		const emitFile = vi.fn().mockReturnValue('ref-id');
		const readFile = vi.fn().mockReturnValue(Buffer.from('data'));

		resolveAssets(makeCachedPaths(), { ...buildOptions, readFile }, emitFile);
		expect(emitFile).toHaveBeenCalledTimes(FORMATS.length * RESOLUTIONS.length);
	});

	it('produces rollup import.meta expressions in build mode', () => {
		const emitFile = vi.fn().mockReturnValue('my-ref');
		const readFile = vi.fn().mockReturnValue(Buffer.from('data'));

		const assets = resolveAssets(makeCachedPaths(), { ...buildOptions, readFile }, emitFile);
		for (const asset of assets) {
			expect(asset.expression).toBe('import.meta.ROLLUP_FILE_URL_my-ref');
		}
	});

	it('throws if emitFile is not provided in build mode', () => {
		expect(() => resolveAssets(makeCachedPaths(), buildOptions)).toThrow('emitFile required');
	});
});

const NON_STRING_INPUT = 99;

describe('normalizeVideoUrl', () => {
	it('returns non-string values unchanged', () => {
		expect(normalizeVideoUrl(NON_STRING_INPUT)).toBe(NON_STRING_INPUT);
		expect(normalizeVideoUrl(false)).toBe(false);
	});

	it('returns non-file: URLs unchanged', () => {
		expect(normalizeVideoUrl('/_enhanced-video/video.mp4')).toBe('/_enhanced-video/video.mp4');
		expect(normalizeVideoUrl('/_app/immutable/assets/video.mp4')).toBe(
			'/_app/immutable/assets/video.mp4'
		);
	});

	it('strips the file:// prefix and returns the /_app/... web path', () => {
		const ssrUrl = 'file:///F:/project/.svelte-kit/output/server/_app/immutable/assets/video.mp4';
		expect(normalizeVideoUrl(ssrUrl)).toBe('/_app/immutable/assets/video.mp4');
	});

	it('returns a file: URL unchanged when it has no /_app/ segment', () => {
		expect(normalizeVideoUrl('file:///some/other/path.mp4')).toBe('file:///some/other/path.mp4');
	});
});

describe('renderExportObject', () => {
	it('includes the __v normalizer helper', () => {
		const assets = [{ format: 'mp4', resolution: RESOLUTION_HIGH, expression: '"url"' }];
		expect(renderExportObject(assets, ['mp4'])).toContain('const __v=');
	});

	it('contains "export default {" in the output', () => {
		const assets = [{ format: 'mp4', resolution: RESOLUTION_HIGH, expression: '"url"' }];
		expect(renderExportObject(assets, ['mp4'])).toContain('export default {');
	});

	it('contains an entry for each format', () => {
		const assets = [
			{ format: 'mp4', resolution: RESOLUTION_HIGH, expression: '"url1"' },
			{ format: 'webm', resolution: RESOLUTION_HIGH, expression: '"url2"' }
		];
		const output = renderExportObject(assets, ['mp4', 'webm']);
		expect(output).toContain('"mp4"');
		expect(output).toContain('"webm"');
	});

	it('wraps each expression in __v(...) rather than using it verbatim', () => {
		const assets = [
			{ format: 'mp4', resolution: RESOLUTION_HIGH, expression: 'import.meta.ROLLUP_FILE_URL_abc' }
		];
		const output = renderExportObject(assets, ['mp4']);
		expect(output).toContain('__v(import.meta.ROLLUP_FILE_URL_abc)');
		expect(output).not.toContain('"import.meta.ROLLUP_FILE_URL_abc"');
	});
});
