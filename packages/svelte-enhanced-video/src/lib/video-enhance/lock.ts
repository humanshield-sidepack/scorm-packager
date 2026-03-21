import fs from 'node:fs';

export interface LockData {
	pid: number;
	startedAt: string;
}

export interface StaleLockDeps {
	exists?: (filePath: string) => boolean;
	readFile?: (filePath: string) => string;
	isProcessAlive?: (pid: number) => boolean;
	now?: () => number;
}

export interface CleanLockDeps {
	removeFile?: (filePath: string) => void;
}

export function getLockFilePath(cachedPath: string): string {
	return `${cachedPath}.lock`;
}

/**
 * Returns `true` when a cached output file exists and no lock file is present,
 * meaning the encode for this path is complete and safe to use.
 *
 * Accepts an optional `exists` function so callers with injected I/O deps
 * (e.g. unit tests) can pass their own implementation. Defaults to `fs.existsSync`.
 */
export function isCached(
	cachedPath: string,
	lockPath: string,
	exists: (filePath: string) => boolean = fs.existsSync
): boolean {
	return exists(cachedPath) && !exists(lockPath);
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
 * Removes a stale lock file and its associated output paths so that the next
 * encoding attempt starts from a clean state.
 *
 * Cleans three paths: the lock, the final output, and the `.incomplete` temp
 * file that ffmpeg writes to before an atomic rename. All removals use force
 * mode, so missing files are silently ignored.
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
	removeFile(`${outputPath}.incomplete`);
}
