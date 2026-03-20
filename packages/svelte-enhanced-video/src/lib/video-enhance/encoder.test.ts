import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import {
	buildOutputFileName,
	encodeVideo,
	ensureEncoded,
	getVideoHeight,
	filterApplicableResolutions
} from './encoder';
import type { EnsureEncodedOptions } from './encoder';

const RESOLUTION_4K = 2160;
const RESOLUTION_1440P = 1440;
const RESOLUTION_1080P = 1080;
const RESOLUTION_720P = 720;
const RESOLUTION_480P = 480;
const RESOLUTION_360P = 360;

function makeDeps(fileExists: boolean, lockExists = false) {
	return {
		exists: vi
			.fn()
			.mockImplementation((filePath: string) =>
				filePath.endsWith('.lock') ? lockExists : fileExists
			),
		mkdirSync: vi.fn(),
		runCommand: vi.fn(),
		log: vi.fn(),
		logError: vi.fn(),
		removeFile: vi.fn()
	};
}

describe('buildOutputFileName', () => {
	it('produces <name>_<hash>_<res>p.<format>', () => {
		expect(
			buildOutputFileName({ baseName: 'hero', hash: 'abc123', resolution: 1080, format: 'mp4' })
		).toBe('hero_abc123_1080p.mp4');
	});

	it('works for webm format', () => {
		expect(
			buildOutputFileName({ baseName: 'clip', hash: 'ff00ff', resolution: 720, format: 'webm' })
		).toBe('clip_ff00ff_720p.webm');
	});

	it('produces a disambiguated .mp4 filename for mp4_hevc', () => {
		expect(
			buildOutputFileName({
				baseName: 'hero',
				hash: 'abc123',
				resolution: 1080,
				format: 'mp4_hevc'
			})
		).toBe('hero_abc123_1080p_hevc.mp4');
	});
});

describe('encodeVideo', () => {
	it('calls the runner with ffmpeg and args containing input and output paths', () => {
		const runner = vi.fn();
		encodeVideo(
			{
				inputPath: '/in/video.mp4',
				outputPath: '/out/video_720p.mp4',
				resolution: 720,
				format: 'mp4'
			},
			runner
		);
		expect(runner).toHaveBeenCalledOnce();
		const [program, arguments_]: [string, string[]] = runner.mock.calls[0] as [string, string[]];
		expect(program).toBe('ffmpeg');
		expect(arguments_).toContain('/in/video.mp4');
		expect(arguments_).toContain('/out/video_720p.mp4');
		expect(arguments_.join(' ')).toContain('scale=-2:720');
	});

	it('uses libx264 codec for mp4', () => {
		const runner = vi.fn();
		encodeVideo(
			{ inputPath: '/in/v.mp4', outputPath: '/out/v.mp4', resolution: 1080, format: 'mp4' },
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		expect(arguments_).toContain('libx264');
	});

	it('uses libvpx-vp9 codec for webm', () => {
		const runner = vi.fn();
		encodeVideo(
			{ inputPath: '/in/v.mp4', outputPath: '/out/v.webm', resolution: 1080, format: 'webm' },
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		expect(arguments_).toContain('libvpx-vp9');
	});
});

describe('encodeVideo - additional codecs', () => {
	it('throws for an unsupported format', () => {
		expect(() =>
			encodeVideo({
				inputPath: '/in/v.mp4',
				outputPath: '/out/v.avi',
				resolution: 720,
				format: 'avi' as 'mp4'
			})
		).toThrow('Unsupported format');
	});

	it('uses libx265 codec for mp4_hevc', () => {
		const runner = vi.fn();
		encodeVideo(
			{
				inputPath: '/in/v.mp4',
				outputPath: '/out/v_hevc.mp4',
				resolution: 1080,
				format: 'mp4_hevc'
			},
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		expect(arguments_).toContain('libx265');
	});
});

describe('ensureEncoded', () => {
	const INPUT = '/project/src/video.mp4';
	const CACHE = '/project/.video-cache/videos';
	const BASE_OPTIONS: EnsureEncodedOptions = {
		inputPath: INPUT,
		baseName: 'video',
		hash: 'abc',
		resolution: 720,
		format: 'mp4',
		cacheDirectory: CACHE
	};

	it('returns the expected cache path regardless of cache hit', () => {
		const deps = makeDeps(true);
		const result = ensureEncoded(BASE_OPTIONS, deps);
		expect(result).toBe(path.join(CACHE, 'video_abc_720p.mp4'));
	});

	it('skips encoding on a cache hit', () => {
		const deps = makeDeps(true);
		ensureEncoded(BASE_OPTIONS, deps);
		expect(deps.runCommand).not.toHaveBeenCalled();
	});

	it('calls the encoder when the file is not cached', () => {
		const deps = makeDeps(false);
		ensureEncoded(BASE_OPTIONS, deps);
		expect(deps.runCommand).toHaveBeenCalledOnce();
	});

	it('creates the cache directory', () => {
		const deps = makeDeps(true);
		ensureEncoded(BASE_OPTIONS, deps);
		expect(deps.mkdirSync).toHaveBeenCalledWith(CACHE, { recursive: true });
	});
});

describe('ensureEncoded - stale lock handling', () => {
	const INPUT = '/project/src/video.mp4';
	const CACHE = '/project/.video-cache/videos';
	const BASE_OPTIONS: EnsureEncodedOptions = {
		inputPath: INPUT,
		baseName: 'video',
		hash: 'abc',
		resolution: 720,
		format: 'mp4',
		cacheDirectory: CACHE
	};

	it('re-encodes when output exists but lock is also present', () => {
		const deps = makeDeps(true, true);
		ensureEncoded(BASE_OPTIONS, deps);
		expect(deps.runCommand).toHaveBeenCalledOnce();
	});

	it('removes the stale lock and corrupt output before re-encoding', () => {
		const deps = makeDeps(true, true);
		ensureEncoded(BASE_OPTIONS, deps);
		expect(deps.removeFile).toHaveBeenCalledWith(expect.stringContaining('.lock'));
		expect(deps.removeFile).toHaveBeenCalledWith(expect.stringContaining('video_abc_720p.mp4'));
	});

	it('treats output with no lock as a clean cache hit', () => {
		const deps = makeDeps(true, false);
		ensureEncoded(BASE_OPTIONS, deps);
		expect(deps.runCommand).not.toHaveBeenCalled();
	});

	it('re-encodes when lock exists but output does not yet', () => {
		const deps = {
			...makeDeps(false, false),
			exists: vi.fn().mockImplementation((filePath: string) => filePath.endsWith('.lock')),
			removeFile: vi.fn(),
			runCommand: vi.fn()
		};
		ensureEncoded(BASE_OPTIONS, deps);
		expect(deps.runCommand).toHaveBeenCalledOnce();
	});
});

describe('ensureEncoded (encoding failure)', () => {
	const INPUT = '/project/src/video.mp4';
	const CACHE = '/project/.video-cache/videos';
	const BASE_OPTIONS: EnsureEncodedOptions = {
		inputPath: INPUT,
		baseName: 'video',
		hash: 'abc',
		resolution: 720,
		format: 'mp4',
		cacheDirectory: CACHE
	};

	it('logs an error, deletes the partial output, and re-throws when encoding fails', () => {
		const deps = {
			exists: vi.fn().mockReturnValue(false),
			mkdirSync: vi.fn(),
			runCommand: vi.fn().mockImplementation(() => {
				throw new Error('ffmpeg error');
			}),
			log: vi.fn(),
			logError: vi.fn(),
			removeFile: vi.fn()
		};
		expect(() => ensureEncoded(BASE_OPTIONS, deps)).toThrow('ffmpeg error');
		expect(deps.logError).toHaveBeenCalled();
		const expectedFileName = buildOutputFileName({
			baseName: BASE_OPTIONS.baseName,
			hash: BASE_OPTIONS.hash,
			resolution: BASE_OPTIONS.resolution,
			format: BASE_OPTIONS.format
		});
		expect(deps.removeFile).toHaveBeenCalledWith(expect.stringContaining(expectedFileName));
	});
});

describe('getVideoHeight', () => {
	it('parses the integer height from ffprobe output', () => {
		expect(getVideoHeight('/video.mp4', { readCommand: () => `${RESOLUTION_1080P}` })).toBe(
			RESOLUTION_1080P
		);
	});

	it('trims surrounding whitespace from ffprobe output', () => {
		expect(getVideoHeight('/video.mp4', { readCommand: () => `  ${RESOLUTION_720P}\n` })).toBe(
			RESOLUTION_720P
		);
	});

	it('throws when ffprobe output is empty', () => {
		expect(() => getVideoHeight('/video.mp4', { readCommand: () => '' })).toThrow(
			'Could not determine video height'
		);
	});

	it('throws when ffprobe outputs a non-numeric value', () => {
		expect(() => getVideoHeight('/video.mp4', { readCommand: () => 'N/A' })).toThrow(
			'Could not determine video height'
		);
	});
});

describe('filterApplicableResolutions', () => {
	const allResolutions = [
		RESOLUTION_4K,
		RESOLUTION_1440P,
		RESOLUTION_1080P,
		RESOLUTION_720P,
		RESOLUTION_480P,
		RESOLUTION_360P
	];

	it('keeps resolutions at or below the source height', () => {
		expect(filterApplicableResolutions(allResolutions, RESOLUTION_1080P)).toEqual([
			RESOLUTION_1080P,
			RESOLUTION_720P,
			RESOLUTION_480P,
			RESOLUTION_360P
		]);
	});

	it('includes a resolution equal to the source height', () => {
		expect(
			filterApplicableResolutions([RESOLUTION_1080P, RESOLUTION_720P], RESOLUTION_720P)
		).toEqual([RESOLUTION_720P]);
	});

	it('returns all resolutions when source is taller than all', () => {
		expect(
			filterApplicableResolutions(
				[RESOLUTION_1080P, RESOLUTION_720P, RESOLUTION_480P],
				RESOLUTION_4K
			)
		).toEqual([RESOLUTION_1080P, RESOLUTION_720P, RESOLUTION_480P]);
	});

	it('returns empty array when all resolutions exceed source height', () => {
		expect(
			filterApplicableResolutions([RESOLUTION_1080P, RESOLUTION_720P], RESOLUTION_480P)
		).toEqual([]);
	});
});
