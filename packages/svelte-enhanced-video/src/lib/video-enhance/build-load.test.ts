import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';

vi.mock('node:fs', () => {
	const statSync = vi.fn();
	return { default: { statSync }, statSync };
});
vi.mock('node:crypto', () => ({
	default: {
		createHash: vi.fn(() => ({
			update: vi.fn().mockReturnThis(),
			digest: vi.fn(() => 'abcdef1234567890'),
			slice: undefined
		}))
	}
}));
vi.mock('./encoder', () => ({
	getVideoInfo: vi.fn(),
	filterApplicableResolutions: vi.fn()
}));
vi.mock('./development-encoder', () => ({
	ensureEncoded: vi.fn()
}));
vi.mock('./assets', () => ({
	resolveAssets: vi.fn(),
	renderExportObject: vi.fn()
}));

import { statSync } from 'node:fs';
import { getVideoInfo, filterApplicableResolutions } from './encoder';
import { ensureEncoded } from './development-encoder';
import { resolveAssets, renderExportObject } from './assets';
import { resolveInputContext, handleBuildLoad } from './build-load';
import type { VideoParameters } from './plugin-types';

const BASE_PARAMS: VideoParameters = {
	formats: ['mp4', 'webm'],
	resolutions: [1080, 720],
	cacheDirectory: '/cache',
	ffmpegBin: 'ffmpeg',
	ffprobeBin: 'ffprobe',
	lockMaxAgeMs: 7_200_000
};

const INPUT_PATH = path.resolve('/project/video.mp4');
const CLEAN_ID = INPUT_PATH;

function makeBuildDeps() {
	return {
		copyFile: vi.fn(),
		base: '/',
		assetsDirectory: 'assets',
		outDirectory: '/dist',
		inputContextCache: new Map(),
		warn: vi.fn(),
		log: vi.fn(),
		logError: vi.fn()
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(statSync).mockReturnValue({ mtimeMs: 1000, size: 2000 } as ReturnType<typeof statSync>);
	vi.mocked(getVideoInfo).mockReturnValue({ height: 1080, fps: 30 });
	vi.mocked(filterApplicableResolutions).mockReturnValue([1080, 720]);
	vi.mocked(ensureEncoded).mockResolvedValue('/cache/video_abc_1080p.mp4');
	vi.mocked(resolveAssets).mockReturnValue([]);
	vi.mocked(renderExportObject).mockReturnValue('export default {}');
});

describe('resolveInputContext', () => {
	it('returns the absolute input path', () => {
		const context = resolveInputContext(CLEAN_ID, BASE_PARAMS);
		expect(context.inputPath).toBe(INPUT_PATH);
	});

	it('generates a hash string from mtime and size', () => {
		const context = resolveInputContext(CLEAN_ID, BASE_PARAMS);
		expect(typeof context.hash).toBe('string');
		expect(context.hash.length).toBeGreaterThan(0);
	});

	it('returns sourceFps from getVideoInfo', () => {
		vi.mocked(getVideoInfo).mockReturnValue({ height: 1080, fps: 24 });
		const context = resolveInputContext(CLEAN_ID, BASE_PARAMS);
		expect(context.sourceFps).toBe(24);
	});

	it('returns applicableResolutions from filterApplicableResolutions', () => {
		vi.mocked(filterApplicableResolutions).mockReturnValue([720]);
		const context = resolveInputContext(CLEAN_ID, BASE_PARAMS);
		expect(context.applicableResolutions).toEqual([720]);
	});

	it('calls warn when applicableResolutions is empty', () => {
		vi.mocked(filterApplicableResolutions).mockReturnValue([]);
		const warn = vi.fn();
		resolveInputContext(CLEAN_ID, BASE_PARAMS, warn);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('video'));
	});

	it('does not call warn when applicableResolutions is non-empty', () => {
		const warn = vi.fn();
		resolveInputContext(CLEAN_ID, BASE_PARAMS, warn);
		expect(warn).not.toHaveBeenCalled();
	});

	it('passes fps to the hash function', () => {
		const parametersWithFps = { ...BASE_PARAMS, fps: 30 };
		const context = resolveInputContext(CLEAN_ID, parametersWithFps);
		expect(typeof context.hash).toBe('string');
		expect(vi.mocked(statSync)).toHaveBeenCalled();
	});
});

describe('handleBuildLoad', () => {
	it('caches the input context by cleanId', async () => {
		const deps = makeBuildDeps();
		await handleBuildLoad(CLEAN_ID, BASE_PARAMS, deps);
		expect(deps.inputContextCache.has(CLEAN_ID)).toBe(true);
	});

	it('calls ensureEncoded for each format × resolution', async () => {
		const deps = makeBuildDeps();
		await handleBuildLoad(CLEAN_ID, BASE_PARAMS, deps);
		expect(vi.mocked(ensureEncoded)).toHaveBeenCalledTimes(
			BASE_PARAMS.formats.length * BASE_PARAMS.resolutions.length
		);
	});

	it('calls renderExportObject and returns its result', async () => {
		const deps = makeBuildDeps();
		vi.mocked(renderExportObject).mockReturnValue('export default { mp4: {} }');
		const result = await handleBuildLoad(CLEAN_ID, BASE_PARAMS, deps);
		expect(result).toBe('export default { mp4: {} }');
	});

	it('calls resolveAssets with isBuild: true', async () => {
		const deps = makeBuildDeps();
		await handleBuildLoad(CLEAN_ID, BASE_PARAMS, deps);
		expect(vi.mocked(resolveAssets)).toHaveBeenCalledWith(
			expect.any(Map),
			expect.objectContaining({ isBuild: true })
		);
	});

	it('calls copyFile for each format × resolution', async () => {
		const deps = makeBuildDeps();
		vi.mocked(ensureEncoded).mockResolvedValue('/cache/video_abc_1080p.mp4');
		await handleBuildLoad(CLEAN_ID, BASE_PARAMS, deps);
		expect(deps.copyFile).toHaveBeenCalledTimes(
			BASE_PARAMS.formats.length * BASE_PARAMS.resolutions.length
		);
	});

	it('passes the correct dest path to copyFile', async () => {
		const deps = makeBuildDeps();
		vi.mocked(ensureEncoded).mockResolvedValue('/cache/video_abc_1080p.mp4');
		await handleBuildLoad(CLEAN_ID, BASE_PARAMS, deps);
		expect(deps.copyFile).toHaveBeenCalledWith(
			'/cache/video_abc_1080p.mp4',
			path.join('/dist', 'assets', 'video_abc_1080p.mp4')
		);
	});

	it('uses cached InputContext and skips re-probing', async () => {
		const cachedContext = {
			inputPath: INPUT_PATH,
			baseName: 'video',
			hash: 'cached123',
			applicableResolutions: [720],
			sourceFps: 30
		};
		const deps = makeBuildDeps();
		deps.inputContextCache.set(CLEAN_ID, cachedContext);
		await handleBuildLoad(CLEAN_ID, BASE_PARAMS, deps);
		expect(vi.mocked(getVideoInfo)).not.toHaveBeenCalled();
	});
});
