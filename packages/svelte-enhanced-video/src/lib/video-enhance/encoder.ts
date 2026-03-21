import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type VideoFormat = 'mp4' | 'webm' | 'mp4_hevc';

const CODEC_ARGUMENTS = new Map<VideoFormat, string[]>([
	[
		'webm',
		[
			'-c:v',
			'libvpx-vp9',
			'-crf',
			'32',
			'-b:v',
			'0',
			'-deadline',
			'good',
			'-cpu-used',
			'2',
			'-c:a',
			'libopus',
			'-b:a',
			'96k'
		]
	],
	[
		'mp4',
		[
			'-c:v',
			'libx264',
			'-crf',
			'23',
			'-preset',
			'slow',
			'-pix_fmt',
			'yuv420p',
			'-c:a',
			'aac',
			'-b:a',
			'128k',
			'-movflags',
			'+faststart'
		]
	],
	[
		'mp4_hevc',
		[
			'-c:v',
			'libx265',
			'-crf',
			'28',
			'-preset',
			'slow',
			'-pix_fmt',
			'yuv420p',
			'-c:a',
			'aac',
			'-b:a',
			'128k',
			'-movflags',
			'+faststart',
			'-tag:v',
			'hvc1'
		]
	]
]);

const FORMAT_EXTENSIONS = new Map<VideoFormat, string>([
	['mp4', 'mp4'],
	['webm', 'webm'],
	['mp4_hevc', 'mp4']
]);

/**
 * MIME types with codec parameters for `<source type="...">`.
 * Including codec strings lets browsers reject unsupported formats before
 * downloading the file. H.264/mp4 is omitted because libx264 can produce
 * varying profiles — an incorrect codec string breaks more than it helps
 * for a universally-supported format.
 *
 * To add a new format: add its `VideoFormat` key and its full MIME type here.
 */
export const FORMAT_MIME_TYPES = new Map<VideoFormat, string>([
	['mp4', 'video/mp4'],
	['webm', 'video/webm; codecs="vp9"'],
	['mp4_hevc', 'video/mp4; codecs="hvc1"']
]);

const FORMAT_SUFFIXES = new Map<VideoFormat, string>([['mp4_hevc', 'hevc']]);

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;
const FFMPEG_STDERR_MAX_MEGABYTES = 100;
/** Generous upper bound for FFmpeg stderr progress output on long-form video (>6 min). */
const FFMPEG_MAX_BUFFER_BYTES = FFMPEG_STDERR_MAX_MEGABYTES * BYTES_PER_MEGABYTE;

export interface BuildOutputFileNameOptions {
	baseName: string;
	hash: string;
	resolution: number;
	format: VideoFormat;
}

export interface EncodeVideoOptions {
	inputPath: string;
	outputPath: string;
	resolution: number;
	format: VideoFormat;
	fps: number;
	ffmpegBin?: string;
}

export interface EnsureEncodedOptions {
	inputPath: string;
	baseName: string;
	hash: string;
	resolution: number;
	format: VideoFormat;
	cacheDirectory: string;
	/** Framerate of the source video, from getVideoFps(). */
	sourceFps: number;
	/** Optional user-configured fps cap. Effective fps = min(fps, sourceFps). */
	fps?: number;
	ffmpegBin?: string;
}

function getFfmpegCodecArguments(format: VideoFormat): string[] {
	const codecArguments = CODEC_ARGUMENTS.get(format);
	if (!codecArguments) throw new Error(`Unsupported format: ${format}`);
	return codecArguments;
}

export function buildOutputFileName(options: BuildOutputFileNameOptions): string {
	const { baseName, hash, resolution, format } = options;
	const suffix = FORMAT_SUFFIXES.get(format);
	const extension = FORMAT_EXTENSIONS.get(format);
	if (!extension) throw new Error(`Unsupported format: ${format}`);
	const stem = suffix
		? `${baseName}_${hash}_${resolution}p_${suffix}`
		: `${baseName}_${hash}_${resolution}p`;
	return `${stem}.${extension}`;
}

function buildFfmpegArguments(videoOptions: EncodeVideoOptions): string[] {
	const { inputPath, outputPath, resolution, format, fps } = videoOptions;
	const codecArguments = getFfmpegCodecArguments(format);
	const containerFormat = FORMAT_EXTENSIONS.get(format) as string;
	return [
		'-i',
		inputPath,
		'-vf',
		`scale=-2:${resolution},fps=${fps}`,
		...codecArguments,
		'-f',
		containerFormat,
		'-y',
		outputPath
	];
}

export async function encodeVideoAsync(
	videoOptions: EncodeVideoOptions,
	run?: (program: string, commandArguments: string[]) => Promise<void>
): Promise<void> {
	const program = videoOptions.ffmpegBin ?? 'ffmpeg';
	const commandArguments = buildFfmpegArguments(videoOptions);
	await (run
		? run(program, commandArguments)
		: execFileAsync(program, commandArguments, { maxBuffer: FFMPEG_MAX_BUFFER_BYTES }));
}

export { getVideoHeight, getVideoFps, getVideoInfo } from './video-probe.js';
export type { VideoProbeDeps, VideoHeightDeps, VideoInfo } from './video-probe.js';

export function filterApplicableResolutions(resolutions: number[], sourceHeight: number): number[] {
	return resolutions.filter((resolution) => resolution <= sourceHeight);
}
