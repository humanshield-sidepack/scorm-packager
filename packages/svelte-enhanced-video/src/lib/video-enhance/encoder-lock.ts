import fs from 'node:fs';
import path from 'node:path';
import { getLockFilePath, buildOutputFileName, encodeVideoAsync } from './encoder';
import type { EnsureEncodedOptions, EncodeVideoOptions } from './encoder';
import { DEFAULT_LOCK_MAX_AGE_MS } from './plugin-types';

export interface StaleLockDeps {
	exists?: (filePath: string) => boolean;
	readFile?: (filePath: string) => string;
	isProcessAlive?: (pid: number) => boolean;
	now?: () => number;
}

export interface CleanLockDeps {
	removeFile?: (filePath: string) => void;
}

export interface AsyncEncoderDeps {
	exists?: (filePath: string) => boolean;
	mkdirSync?: (directoryPath: string, options?: { recursive: boolean }) => void;
	log?: (message: string) => void;
	logError?: (message: string, error: unknown) => void;
	writeLock?: (lockPath: string, content: string) => void;
	removeLock?: (lockPath: string) => void;
	readLock?: (lockPath: string) => string;
	isProcessAlive?: (pid: number) => boolean;
	now?: () => number;
	lockMaxAgeMs?: number;
	encodeAsync?: (options: EncodeVideoOptions) => Promise<void>;
}

interface LockData {
	pid: number;
	startedAt: string;
}

function defaultIsProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === 'EPERM';
	}
}

/**
 * Determines whether an existing lock file should be treated as stale.
 *
 * A lock is considered stale if any of the following are true:
 * - The lock file does not exist (returns `false` — not stale, nothing to clean)
 * - The lock file contains invalid JSON
 * - The process that wrote the lock is no longer alive
 * - The lock has been held longer than `maxAgeMs` (protects against zombie processes)
 *
 * All I/O and process-check operations are injectable via `deps` for testing.
 */
export function isLockStale(lockPath: string, maxAgeMs: number, deps: StaleLockDeps = {}): boolean {
	const {
		exists = fs.existsSync,
		readFile = (filePath: string) => fs.readFileSync(filePath, 'utf8'),
		isProcessAlive = defaultIsProcessAlive,
		now = Date.now
	} = deps;

	if (!exists(lockPath)) return false;

	let lockData: LockData;
	try {
		lockData = JSON.parse(readFile(lockPath)) as LockData;
	} catch {
		return true;
	}

	if (!isProcessAlive(lockData.pid)) return true;

	return now() - new Date(lockData.startedAt).getTime() > maxAgeMs;
}

/**
 * Removes a stale lock file and its associated (potentially partial) output
 * file so that the next encoding attempt starts from a clean state.
 */
export function cleanStaleLock(
	lockPath: string,
	outputPath: string,
	deps: CleanLockDeps = {}
): void {
	const removeFile =
		deps.removeFile ?? ((filePath: string) => fs.rmSync(filePath, { force: true }));
	removeFile(lockPath);
	removeFile(outputPath);
}

function buildLockContent(nowMs: number): string {
	return JSON.stringify({ pid: process.pid, startedAt: new Date(nowMs).toISOString() });
}

/**
 * Async variant of the encode-or-cache check, used by the Vite dev server.
 *
 * Unlike the synchronous `ensureEncoded`, this function does **not** re-throw
 * FFmpeg errors — the dev server must stay alive and will fall back to serving
 * the original unencoded video until the next successful encode. Errors are
 * logged via `logError`.
 *
 * Lock lifecycle:
 * 1. Return immediately if a cached output already exists.
 * 2. If a lock exists and is not stale, another process is already encoding —
 *    return and let the caller poll/watch for the output.
 * 3. If the lock is stale (process dead or timed out), clean it up and re-encode.
 * 4. Write a lock containing the current PID and timestamp, encode, then remove the lock.
 *
 * All I/O and process operations are injectable via `deps` for testing.
 */
export async function ensureEncodedAsync(
	encodeOptions: EnsureEncodedOptions,
	deps: AsyncEncoderDeps = {}
): Promise<void> {
	const { inputPath, baseName, hash, resolution, format, cacheDirectory, ffmpegBin } =
		encodeOptions;
	const {
		exists = fs.existsSync,
		mkdirSync = fs.mkdirSync,
		log = console.log,
		logError = console.error,
		writeLock = (lockPath: string, content: string) => fs.writeFileSync(lockPath, content),
		removeLock = (lockPath: string) => fs.rmSync(lockPath, { force: true }),
		readLock = (lockPath: string) => fs.readFileSync(lockPath, 'utf8'),
		isProcessAlive,
		now = Date.now,
		lockMaxAgeMs = DEFAULT_LOCK_MAX_AGE_MS,
		encodeAsync = encodeVideoAsync
	} = deps;

	mkdirSync(cacheDirectory, { recursive: true });

	const fileName = buildOutputFileName({ baseName, hash, resolution, format });
	const cachedPath = path.join(cacheDirectory, fileName);
	const lockPath = getLockFilePath(cachedPath);

	if (exists(cachedPath)) return;

	if (exists(lockPath)) {
		if (!isLockStale(lockPath, lockMaxAgeMs, { exists, readFile: readLock, isProcessAlive, now })) {
			return;
		}
		cleanStaleLock(lockPath, cachedPath, { removeFile: removeLock });
	}

	writeLock(lockPath, buildLockContent(now()));
	log(`[video-plugin] encoding ${fileName}`);
	try {
		await encodeAsync({ inputPath, outputPath: cachedPath, resolution, format, ffmpegBin });
		log(`[video-plugin] encoded ${fileName}`);
	} catch (error) {
		logError(`[video-plugin] ffmpeg failed for ${fileName}:`, error);
	} finally {
		removeLock(lockPath);
	}
}
