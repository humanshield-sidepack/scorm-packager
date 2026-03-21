import { describe, it, expect, vi } from 'vitest';
import {
	buildOutputFileName,
	encodeVideoAsync,
	getVideoHeight,
	getVideoFps,
	filterApplicableResolutions
} from './encoder';

const RESOLUTION_4K = 2160;
const RESOLUTION_1440P = 1440;
const RESOLUTION_1080P = 1080;
const RESOLUTION_720P = 720;
const RESOLUTION_480P = 480;
const RESOLUTION_360P = 360;

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

describe('encodeVideoAsync', () => {
	it('calls the runner with ffmpeg and args containing input and output paths', async () => {
		const runner = vi.fn().mockResolvedValue();
		await encodeVideoAsync(
			{
				inputPath: '/in/video.mp4',
				outputPath: '/out/video_720p.mp4',
				resolution: 720,
				format: 'mp4',
				fps: 30
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

	it('passes -f with the container format so FFmpeg does not infer it from the output extension', async () => {
		const runner = vi.fn().mockResolvedValue();
		await encodeVideoAsync(
			{
				inputPath: '/in/v.mp4',
				outputPath: '/out/v.mp4.incomplete',
				resolution: 720,
				format: 'mp4',
				fps: 30
			},
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		const formatIndex = arguments_.indexOf('-f');
		expect(formatIndex).toBeGreaterThan(-1);
		expect(arguments_[formatIndex + 1]).toBe('mp4');
	});

	it('passes -f webm for webm format', async () => {
		const runner = vi.fn().mockResolvedValue();
		await encodeVideoAsync(
			{
				inputPath: '/in/v.mp4',
				outputPath: '/out/v.webm.incomplete',
				resolution: 720,
				format: 'webm',
				fps: 30
			},
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		const formatIndex = arguments_.indexOf('-f');
		expect(formatIndex).toBeGreaterThan(-1);
		expect(arguments_[formatIndex + 1]).toBe('webm');
	});

	it('includes the fps value in the scale filter', async () => {
		const runner = vi.fn().mockResolvedValue();
		await encodeVideoAsync(
			{ inputPath: '/in/v.mp4', outputPath: '/out/v.mp4', resolution: 720, format: 'mp4', fps: 24 },
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		expect(arguments_.join(' ')).toContain('scale=-2:720,fps=24');
	});

	it('uses libx264 codec for mp4', async () => {
		const runner = vi.fn().mockResolvedValue();
		await encodeVideoAsync(
			{
				inputPath: '/in/v.mp4',
				outputPath: '/out/v.mp4',
				resolution: 1080,
				format: 'mp4',
				fps: 30
			},
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		expect(arguments_).toContain('libx264');
	});

	it('uses libvpx-vp9 codec for webm', async () => {
		const runner = vi.fn().mockResolvedValue();
		await encodeVideoAsync(
			{
				inputPath: '/in/v.mp4',
				outputPath: '/out/v.webm',
				resolution: 1080,
				format: 'webm',
				fps: 30
			},
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		expect(arguments_).toContain('libvpx-vp9');
	});

	it('throws for an unsupported format', async () => {
		await expect(
			encodeVideoAsync({
				inputPath: '/in/v.mp4',
				outputPath: '/out/v.avi',
				resolution: 720,
				format: 'avi' as 'mp4',
				fps: 30
			})
		).rejects.toThrow('Unsupported format');
	});

	it('uses libx265 codec for mp4_hevc', async () => {
		const runner = vi.fn().mockResolvedValue();
		await encodeVideoAsync(
			{
				inputPath: '/in/v.mp4',
				outputPath: '/out/v_hevc.mp4',
				resolution: 1080,
				format: 'mp4_hevc',
				fps: 30
			},
			runner
		);
		const arguments_: string[] = runner.mock.calls[0]![1] as string[];
		expect(arguments_).toContain('libx265');
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

describe('getVideoFps', () => {
	it('parses a simple integer rational like "24/1"', () => {
		expect(getVideoFps('/video.mp4', { readCommand: () => '24/1' })).toBe(24);
	});

	it('parses a fractional rational like "30000/1001" (NTSC 29.97)', () => {
		const fps = getVideoFps('/video.mp4', { readCommand: () => '30000/1001' });
		expect(fps).toBeCloseTo(29.97, 1);
	});

	it('parses "60/1" for 60fps content', () => {
		expect(getVideoFps('/video.mp4', { readCommand: () => '60/1' })).toBe(60);
	});

	it('throws when ffprobe output is empty', () => {
		expect(() => getVideoFps('/video.mp4', { readCommand: () => '' })).toThrow(
			'Could not determine video fps'
		);
	});

	it('throws when the denominator is zero', () => {
		expect(() => getVideoFps('/video.mp4', { readCommand: () => '30/0' })).toThrow(
			'Could not determine video fps'
		);
	});

	it('throws when ffprobe outputs a non-rational value', () => {
		expect(() => getVideoFps('/video.mp4', { readCommand: () => 'N/A' })).toThrow(
			'Could not determine video fps'
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
