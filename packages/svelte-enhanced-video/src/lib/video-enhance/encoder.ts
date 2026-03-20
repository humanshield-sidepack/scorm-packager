import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export type VideoFormat = 'mp4' | 'webm' | 'mp4_hevc';

const CODEC_ARGUMENTS: Record<VideoFormat, string[]> = {
	webm: [
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
	],
	mp4: [
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
	],
	mp4_hevc: [
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
};

export const FORMAT_EXTENSIONS: Record<VideoFormat, string> = {
	mp4: 'mp4',
	webm: 'webm',
	mp4_hevc: 'mp4'
};

export const FORMAT_MIME_TYPES: Record<VideoFormat, string> = {
	mp4: 'video/mp4',
	webm: 'video/webm',
	mp4_hevc: 'video/mp4'
};

const FORMAT_SUFFIXES: Partial<Record<VideoFormat, string>> = {
	mp4_hevc: 'hevc'
};

export interface EncodeOptions {
	resolutions: number[];
	formats: VideoFormat[];
	cacheDirectory: string;
}

export interface EncodedFile {
	format: VideoFormat;
	resolution: number;
	filePath: string;
	fileName: string;
}

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
	ffmpegBin?: string;
}

export interface EnsureEncodedOptions {
	inputPath: string;
	baseName: string;
	hash: string;
	resolution: number;
	format: VideoFormat;
	cacheDirectory: string;
	ffmpegBin?: string;
}

interface EncoderDeps {
	exists?: (filePath: string) => boolean;
	mkdirSync?: (directoryPath: string, options?: { recursive: boolean }) => void;
	runCommand?: (program: string, arguments_: string[]) => void;
	log?: (message: string) => void;
	logError?: (message: string, error: unknown) => void;
	removeFile?: (filePath: string) => void;
}

function getFfmpegCodecArguments(format: VideoFormat): string[] {
	const arguments_ = CODEC_ARGUMENTS[format];
	if (!arguments_) throw new Error(`Unsupported format: ${format}`);
	return arguments_;
}

export function buildOutputFileName(options: BuildOutputFileNameOptions): string {
	const { baseName, hash, resolution, format } = options;
	const suffix = FORMAT_SUFFIXES[format];
	const extension = FORMAT_EXTENSIONS[format];
	const stem = suffix
		? `${baseName}_${hash}_${resolution}p_${suffix}`
		: `${baseName}_${hash}_${resolution}p`;
	return `${stem}.${extension}`;
}

export function encodeVideo(
	videoOptions: EncodeVideoOptions,
	run: (program: string, arguments_: string[]) => void = (program, arguments_) =>
		execFileSync(program, arguments_, { stdio: 'inherit' })
): void {
	const { inputPath, outputPath, resolution, format } = videoOptions;
	const codecArguments = getFfmpegCodecArguments(format);
	const arguments_ = [
		'-i',
		inputPath,
		'-vf',
		`scale=-2:${resolution},fps=30`,
		...codecArguments,
		'-y',
		outputPath
	];
	run(videoOptions.ffmpegBin ?? 'ffmpeg', arguments_);
}

export function getLockFilePath(cachedPath: string): string {
	return `${cachedPath}.lock`;
}

export interface VideoHeightDeps {
	ffprobeBin?: string;
	readCommand?: (program: string, arguments_: string[]) => string;
}

export function getVideoHeight(inputPath: string, deps: VideoHeightDeps = {}): number {
	const readCommand =
		deps.readCommand ??
		((program: string, arguments_: string[]) => execFileSync(program, arguments_).toString());
	const output = readCommand(deps.ffprobeBin ?? 'ffprobe', [
		'-v',
		'error',
		'-select_streams',
		'v:0',
		'-show_entries',
		'stream=height',
		'-of',
		'csv=p=0',
		inputPath
	]).trim();
	const height = Number.parseInt(output, 10);
	if (Number.isNaN(height)) throw new Error(`Could not determine video height for: ${inputPath}`);
	return height;
}

export function filterApplicableResolutions(resolutions: number[], sourceHeight: number): number[] {
	return resolutions.filter((resolution) => resolution <= sourceHeight);
}

export async function encodeVideoAsync(videoOptions: EncodeVideoOptions): Promise<void> {
	const { inputPath, outputPath, resolution, format } = videoOptions;
	const codecArguments = getFfmpegCodecArguments(format);
	const arguments_ = [
		'-i',
		inputPath,
		'-vf',
		`scale=-2:${resolution},fps=30`,
		...codecArguments,
		'-y',
		outputPath
	];
	await execFileAsync(videoOptions.ffmpegBin ?? 'ffmpeg', arguments_);
}

/**
 * Ensures a video file is encoded to the requested format and resolution,
 * using a file-system cache to avoid re-encoding on subsequent builds.
 *
 * **Build-time only.** This function is synchronous and intended for use inside
 * Rollup/Vite `load` hooks. On a cache hit it returns immediately. On a miss it
 * runs FFmpeg synchronously and returns the cached output path.
 *
 * If FFmpeg fails mid-encode, the partial output file is deleted and the error
 * is re-thrown so the build pipeline receives a meaningful failure rather than
 * a confusing ENOENT when Rollup tries to read the missing file.
 *
 * All I/O operations are injectable via `deps` for unit-testing without touching
 * the real file system or spawning real processes.
 */
export function ensureEncoded(encodeOptions: EnsureEncodedOptions, deps: EncoderDeps = {}): string {
	const { inputPath, baseName, hash, resolution, format, cacheDirectory, ffmpegBin } =
		encodeOptions;
	const {
		exists = fs.existsSync,
		mkdirSync = fs.mkdirSync,
		runCommand,
		log = console.log,
		logError = console.error,
		removeFile = (filePath: string) => fs.rmSync(filePath, { force: true })
	} = deps;

	mkdirSync(cacheDirectory, { recursive: true });

	const fileName = buildOutputFileName({ baseName, hash, resolution, format });
	const cachedPath = path.join(cacheDirectory, fileName);
	const lockPath = getLockFilePath(cachedPath);

	if (exists(cachedPath) && !exists(lockPath)) {
		log(`[video-plugin] cache hit ${fileName}`);
	} else {
		if (exists(lockPath)) {
			removeFile(lockPath);
			if (exists(cachedPath)) removeFile(cachedPath);
		}
		log(`[video-plugin] encoding ${fileName} -> ${cachedPath}`);
		try {
			encodeVideo({ inputPath, outputPath: cachedPath, resolution, format, ffmpegBin }, runCommand);
		} catch (error) {
			logError(`[video-plugin] ffmpeg failed for ${fileName}:`, error);
			removeFile(cachedPath);
			throw error;
		}
	}

	return cachedPath;
}
