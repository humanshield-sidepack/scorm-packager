import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

export interface ResolvedBinaries {
	ffmpeg: string;
	ffprobe: string;
}

interface BinaryHints {
	ffmpegPath?: string;
	ffprobePath?: string;
	warn?: (message: string) => void;
}

interface CombinedPackageResult {
	ffmpeg?: string;
	ffprobe?: string;
}

interface FfmpegFfprobeStaticModule {
	ffmpegPath?: string | null;
	ffprobePath?: string | null;
}

interface FfprobeStaticModule {
	path?: string;
}

const FFPROBE_STATIC_VERSION_WARNING =
	'[svelte-enhanced-video] Warning: ffprobe-static ships ffprobe 4.0.2 (2018), ' +
	'which may fail on videos encoded with newer codecs. ' +
	'Consider installing ffmpeg-ffprobe-static for a matched version pair:\n' +
	'  pnpm add ffmpeg-ffprobe-static';

const FFMPEG_NOT_FOUND_ERROR =
	'[svelte-enhanced-video] FFmpeg not found. Video encoding is not possible without it.\n\n' +
	'To fix this, choose one of:\n' +
	'  1. Install ffmpeg-ffprobe-static (recommended — includes both binaries):\n' +
	'       pnpm add ffmpeg-ffprobe-static\n' +
	'  2. Install ffmpeg-static + ffprobe-static separately:\n' +
	'       pnpm add ffmpeg-static ffprobe-static\n' +
	'  3. Install FFmpeg system-wide: https://ffmpeg.org/download.html\n' +
	"  4. Pass explicit paths: enhancedVideo({ ffmpegPath: '/usr/local/bin/ffmpeg' })";

const FFPROBE_NOT_FOUND_ERROR =
	'[svelte-enhanced-video] FFprobe not found. It is required to read video metadata.\n\n' +
	'To fix this, choose one of:\n' +
	'  1. Install ffmpeg-ffprobe-static (recommended — includes both binaries):\n' +
	'       pnpm add ffmpeg-ffprobe-static\n' +
	'  2. Install ffprobe-static: pnpm add ffprobe-static\n' +
	'  3. Install FFmpeg system-wide (ships with ffprobe): https://ffmpeg.org/download.html\n' +
	"  4. Pass explicit path: enhancedVideo({ ffprobePath: '/usr/local/bin/ffprobe' })";

function isExecutable(binaryPath: string): boolean {
	if (!existsSync(binaryPath)) return false;
	try {
		execFileSync(binaryPath, ['-version'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

function isOnPath(binaryName: string): boolean {
	try {
		execFileSync(binaryName, ['-version'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

function ffprobeNameForPlatform(): string {
	return os.platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe';
}

function validateExplicitPath(binaryPath: string, label: string): void {
	if (!isExecutable(binaryPath)) {
		throw new Error(
			`[svelte-enhanced-video] Provided ${label} does not exist or is not executable: ${binaryPath}`
		);
	}
}

async function loadCombinedPackage(): Promise<CombinedPackageResult> {
	try {
		const module_ = (await import('ffmpeg-ffprobe-static')) as FfmpegFfprobeStaticModule;
		const { ffmpegPath, ffprobePath } = module_;
		return {
			ffmpeg: typeof ffmpegPath === 'string' && isExecutable(ffmpegPath) ? ffmpegPath : undefined,
			ffprobe:
				typeof ffprobePath === 'string' && isExecutable(ffprobePath) ? ffprobePath : undefined
		};
	} catch {
		return {};
	}
}

async function tryFfmpegStatic(): Promise<string | undefined> {
	try {
		const module_ = await import('ffmpeg-static');
		const value = (module_ as { default?: unknown }).default;
		return typeof value === 'string' && isExecutable(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

async function tryFfprobeStatic(): Promise<string | undefined> {
	try {
		// eslint-disable-next-line no-comments/disallowComments
		// @ts-expect-error - no types available
		const module_ = (await import('ffprobe-static')) as FfprobeStaticModule;
		const value = module_.path;
		return typeof value === 'string' && isExecutable(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

async function resolveFfmpegBin(
	explicitPath: string | undefined,
	combined: CombinedPackageResult
): Promise<string> {
	if (explicitPath !== undefined) {
		validateExplicitPath(explicitPath, 'ffmpegPath');
		return explicitPath;
	}
	if (combined.ffmpeg !== undefined) return combined.ffmpeg;
	const fromStatic = await tryFfmpegStatic();
	if (fromStatic !== undefined) return fromStatic;
	if (isOnPath('ffmpeg')) return 'ffmpeg';
	throw new Error(FFMPEG_NOT_FOUND_ERROR);
}

interface ResolveFfprobeBinOptions {
	explicitPath: string | undefined;
	combined: CombinedPackageResult;
	ffmpegBin: string;
	warn: (message: string) => void;
}

async function resolveFfprobeBin(options: ResolveFfprobeBinOptions): Promise<string> {
	const { explicitPath, combined, ffmpegBin, warn } = options;
	if (explicitPath !== undefined) {
		validateExplicitPath(explicitPath, 'ffprobePath');
		return explicitPath;
	}
	if (combined.ffprobe !== undefined) return combined.ffprobe;
	const fromStatic = await tryFfprobeStatic();
	if (fromStatic !== undefined) {
		warn(FFPROBE_STATIC_VERSION_WARNING);
		return fromStatic;
	}
	const sibling = path.join(path.dirname(ffmpegBin), ffprobeNameForPlatform());
	if (isExecutable(sibling)) return sibling;
	if (isOnPath('ffprobe')) return 'ffprobe';
	throw new Error(FFPROBE_NOT_FOUND_ERROR);
}

export async function resolveBinaries(hints: BinaryHints = {}): Promise<ResolvedBinaries> {
	const warn = hints.warn ?? (() => {});
	const combined = await loadCombinedPackage();
	const ffmpeg = await resolveFfmpegBin(hints.ffmpegPath, combined);
	const ffprobe = await resolveFfprobeBin({
		explicitPath: hints.ffprobePath,
		combined,
		ffmpegBin: ffmpeg,
		warn
	});
	return { ffmpeg, ffprobe };
}
