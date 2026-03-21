import { describe, it, expect } from 'vitest';
import type { VideoFormat } from './encoder';
import { developmentUrl, resolveAssets, renderExportObject } from './assets';
import type { ResolvedAsset } from './assets';

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
		base: '/',
		assetsDirectory: 'assets'
	};

	it('returns one asset per format × resolution', () => {
		const assets = resolveAssets(makeCachedPaths(), buildOptions);
		expect(assets).toHaveLength(FORMATS.length * RESOLUTIONS.length);
	});

	it('produces a JSON-string web URL using base + assetsDirectory + filename', () => {
		const assets = resolveAssets(makeCachedPaths(), buildOptions);
		const mp4High = assets.find((a) => a.format === 'mp4' && a.resolution === RESOLUTION_HIGH)!;
		expect(mp4High.expression).toBe('"/assets/video_abc_1080p.mp4"');
	});

	it('uses custom base and assetsDirectory', () => {
		const assets = resolveAssets(makeCachedPaths(), {
			...buildOptions,
			base: '/app/',
			assetsDirectory: 'static'
		});
		const mp4High = assets.find((a) => a.format === 'mp4' && a.resolution === RESOLUTION_HIGH)!;
		expect(mp4High.expression).toBe('"/app/static/video_abc_1080p.mp4"');
	});

	it('normalizes base without trailing slash', () => {
		const assets = resolveAssets(makeCachedPaths(), {
			...buildOptions,
			base: '/app',
			assetsDirectory: 'assets'
		});
		const mp4High = assets.find((a) => a.format === 'mp4' && a.resolution === RESOLUTION_HIGH)!;
		expect(mp4High.expression).toBe('"/app/assets/video_abc_1080p.mp4"');
	});

	it('normalizes both base and assetsDirectory slashes', () => {
		const assets = resolveAssets(makeCachedPaths(), {
			...buildOptions,
			base: '/app/',
			assetsDirectory: '/assets/'
		});
		const mp4High = assets.find((a) => a.format === 'mp4' && a.resolution === RESOLUTION_HIGH)!;
		expect(mp4High.expression).toBe('"/app/assets/video_abc_1080p.mp4"');
	});

	it('normalizes root base with slashed assetsDirectory', () => {
		const assets = resolveAssets(makeCachedPaths(), {
			...buildOptions,
			base: '/',
			assetsDirectory: '/assets/'
		});
		const mp4High = assets.find((a) => a.format === 'mp4' && a.resolution === RESOLUTION_HIGH)!;
		expect(mp4High.expression).toBe('"/assets/video_abc_1080p.mp4"');
	});

	it('defaults base to "/" and assetsDirectory to "assets" when omitted', () => {
		const assets = resolveAssets(makeCachedPaths(), {
			isBuild: true,
			formats: FORMATS,
			resolutions: RESOLUTIONS
		});
		const mp4High = assets.find((a) => a.format === 'mp4' && a.resolution === RESOLUTION_HIGH)!;
		expect(mp4High.expression).toBe('"/assets/video_abc_1080p.mp4"');
	});
});

describe('renderExportObject', () => {
	it('contains "export default {" in the output', () => {
		const assets = [
			{ format: 'mp4', resolution: RESOLUTION_HIGH, expression: '"url"' } satisfies ResolvedAsset
		];
		expect(renderExportObject(assets, ['mp4'])).toContain('export default {');
	});

	it('contains an entry for each format', () => {
		const assets = [
			{ format: 'mp4', resolution: RESOLUTION_HIGH, expression: '"url1"' } satisfies ResolvedAsset,
			{ format: 'webm', resolution: RESOLUTION_HIGH, expression: '"url2"' } satisfies ResolvedAsset
		];
		const output = renderExportObject(assets, ['mp4', 'webm']);
		expect(output).toContain('"mp4"');
		expect(output).toContain('"webm"');
	});

	it('uses the expression directly without any wrapper', () => {
		const assets = [
			{
				format: 'mp4',
				resolution: RESOLUTION_HIGH,
				expression: '"/assets/video.mp4"'
			} satisfies ResolvedAsset
		];
		const output = renderExportObject(assets, ['mp4']);
		expect(output).toContain('"1080p": "/assets/video.mp4"');
	});

	it('does not include a __v normalizer helper', () => {
		const assets = [
			{ format: 'mp4', resolution: RESOLUTION_HIGH, expression: '"url"' } satisfies ResolvedAsset
		];
		expect(renderExportObject(assets, ['mp4'])).not.toContain('__v');
	});
});
