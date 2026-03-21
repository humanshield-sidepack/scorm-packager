import fs from 'node:fs';
import path from 'node:path';
import { buildOutputFileName, encodeVideoAsync } from './encoder.js';
import type { EnsureEncodedOptions, EncodeVideoOptions, VideoFormat } from './encoder.js';
import { getLockFilePath, isLockStale, cleanStaleLock } from './lock.js';
import { DEFAULT_LOCK_MAX_AGE_MS } from './plugin-types.js';

export interface AsyncEncoderDeps {
	exists?: (filePath: string) => boolean;
	mkdirSync?: (directoryPath: string, options?: { recursive: boolean }) => void;
	log?: (message: string) => void;
	logError?: (message: string, error: unknown) => void;
	writeLock?: (lockPath: string, content: string) => void;
	removeLock?: (lockPath: string) => void;
	removeFile?: (filePath: string) => void;
	renameFile?: (from: string, to: string) => void;
	readLock?: (lockPath: string) => string;
	isProcessAlive?: (pid: number) => boolean;
	now?: () => number;
	lockMaxAgeMs?: number;
	encodeAsync?: (options: EncodeVideoOptions) => Promise<void>;
	/** When true, re-throws ffmpeg errors (build-time behavior). Default: false (dev server stays alive). */
	throwOnError?: boolean;
}

interface ResolvedAsyncEncoderDeps {
	exists: (filePath: string) => boolean;
	mkdirSync: (directoryPath: string, options?: { recursive: boolean }) => void;
	log: (message: string) => void;
	logError: (message: string, error: unknown) => void;
	writeLock: (lockPath: string, content: string) => void;
	removeLock: (lockPath: string) => void;
	removeFile: (filePath: string) => void;
	renameFile: (from: string, to: string) => void;
	readLock: (lockPath: string) => string;
	isProcessAlive: ((pid: number) => boolean) | undefined;
	now: () => number;
	lockMaxAgeMs: number;
	encodeAsync: (options: EncodeVideoOptions) => Promise<void>;
	throwOnError: boolean;
}

function resolveAsyncEncoderDeps(deps: AsyncEncoderDeps): ResolvedAsyncEncoderDeps {
	return {
		exists: deps.exists ?? fs.existsSync,
		mkdirSync: deps.mkdirSync ?? fs.mkdirSync,
		log: deps.log ?? console.log,
		logError: deps.logError ?? console.error,
		writeLock: deps.writeLock ?? ((lockPath, content) => fs.writeFileSync(lockPath, content)),
		removeLock: deps.removeLock ?? ((lockPath) => fs.rmSync(lockPath, { force: true })),
		removeFile: deps.removeFile ?? ((filePath) => fs.rmSync(filePath, { force: true })),
		renameFile: deps.renameFile ?? ((from, to) => fs.renameSync(from, to)),
		readLock: deps.readLock ?? ((lockPath) => fs.readFileSync(lockPath, 'utf8')),
		isProcessAlive: deps.isProcessAlive,
		now: deps.now ?? Date.now,
		lockMaxAgeMs: deps.lockMaxAgeMs ?? DEFAULT_LOCK_MAX_AGE_MS,
		encodeAsync: deps.encodeAsync ?? encodeVideoAsync,
		throwOnError: deps.throwOnError ?? false
	};
}

function buildLockContent(nowMs: number): string {
	return JSON.stringify({ pid: process.pid, startedAt: new Date(nowMs).toISOString() });
}

interface RunIfNotCachedArguments {
	cachedPath: string;
	lockPath: string;
	incompletePath: string;
	fileName: string;
	inputPath: string;
	resolution: number;
	format: VideoFormat;
	cappedFps: number;
	ffmpegBin: string | undefined;
}

async function runIfNotCached(
	runArguments: RunIfNotCachedArguments,
	deps: ResolvedAsyncEncoderDeps
): Promise<void> {
	const {
		cachedPath,
		lockPath,
		incompletePath,
		fileName,
		inputPath,
		resolution,
		format,
		cappedFps,
		ffmpegBin
	} = runArguments;

	if (deps.exists(cachedPath)) return;

	if (deps.exists(lockPath)) {
		if (
			!isLockStale(lockPath, deps.lockMaxAgeMs, {
				exists: deps.exists,
				readFile: deps.readLock,
				isProcessAlive: deps.isProcessAlive,
				now: deps.now
			})
		) {
			return;
		}
		cleanStaleLock(lockPath, cachedPath, { removeFile: deps.removeLock });
	}

	deps.writeLock(lockPath, buildLockContent(deps.now()));
	deps.log(`[video-plugin] encoding ${fileName}`);
	try {
		await deps.encodeAsync({
			inputPath,
			outputPath: incompletePath,
			resolution,
			format,
			fps: cappedFps,
			ffmpegBin
		});
		deps.renameFile(incompletePath, cachedPath);
		deps.log(`[video-plugin] encoded ${fileName}`);
	} catch (error) {
		deps.logError(`[video-plugin] ffmpeg failed for ${fileName}:`, error);
		deps.removeFile(incompletePath);
		if (deps.throwOnError) throw error;
	} finally {
		deps.removeLock(lockPath);
	}
}

/**
 * Ensures a video file is encoded to the requested format and resolution,
 * using a file-system cache to avoid re-encoding on subsequent calls.
 * Returns the computed `cachedPath` regardless of whether encoding ran.
 *
 * Works in both build-time and dev-server contexts:
 * - Pass `throwOnError: true` (build) to propagate FFmpeg errors to the caller.
 * - Omit it (dev default) to log the error and resolve normally; the caller is
 *   responsible for any fallback behavior (e.g. serving the original video).
 *
 * Uses a temp-file + atomic rename pattern: FFmpeg writes to
 * `<cachedPath>.incomplete` and on success that file is renamed to `cachedPath`.
 * A file at `cachedPath` is therefore always a complete encode. On failure the
 * `.incomplete` file is removed.
 *
 * Lock lifecycle:
 * 1. If `cachedPath` already exists, return it immediately (no lock check needed —
 *    a file at `cachedPath` is always complete due to the atomic rename).
 * 2. If a lock exists and is not stale, another process is encoding — return
 *    `cachedPath` without encoding (caller must handle the not-yet-existing file).
 * 3. If the lock is stale (process dead or timed out), clean it up and re-encode.
 * 4. Write a lock, encode to a temp path, rename on success, then remove the lock.
 *
 * **TOCTOU note:** There is an inherent race between the `exists(cachedPath)` /
 * `exists(lockPath)` checks and the subsequent `writeLock` call. Another process
 * could claim the lock in that window. This is acceptable — the worst outcome is
 * two processes encoding the same file simultaneously; the atomic rename ensures
 * only one complete file lands at `cachedPath`.
 *
 * All I/O and process operations are injectable via `deps` for testing.
 */
export async function ensureEncoded(
	encodeOptions: EnsureEncodedOptions,
	deps: AsyncEncoderDeps = {}
): Promise<string> {
	const {
		inputPath,
		baseName,
		hash,
		resolution,
		format,
		cacheDirectory,
		ffmpegBin,
		sourceFps,
		fps
	} = encodeOptions;
	const resolved = resolveAsyncEncoderDeps(deps);

	resolved.mkdirSync(cacheDirectory, { recursive: true });

	const fileName = buildOutputFileName({ baseName, hash, resolution, format });
	const cachedPath = path.join(cacheDirectory, fileName);
	const incompletePath = `${cachedPath}.incomplete`;
	const lockPath = getLockFilePath(cachedPath);

	const cappedFps = fps === undefined ? sourceFps : Math.min(fps, sourceFps);
	await runIfNotCached(
		{
			cachedPath,
			lockPath,
			incompletePath,
			fileName,
			inputPath,
			resolution,
			format,
			cappedFps,
			ffmpegBin
		},
		resolved
	);
	return cachedPath;
}
