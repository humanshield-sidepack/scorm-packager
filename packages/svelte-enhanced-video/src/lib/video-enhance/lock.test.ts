import { describe, it, expect, vi } from 'vitest';
import { getLockFilePath, isCached, isLockStale, cleanStaleLock } from './lock';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const CACHED_PATH = '/cache/video_abc_720p.mp4';
const LOCK_PATH = `${CACHED_PATH}.lock`;
const OUTPUT_PATH = '/cache/video_abc_720p.mp4';

function staleLock(pid = 99_999): string {
	return JSON.stringify({
		pid,
		startedAt: new Date(Date.now() - THREE_HOURS_MS).toISOString()
	});
}

function freshLock(pid = 99_999): string {
	return JSON.stringify({
		pid,
		startedAt: new Date().toISOString()
	});
}

describe('getLockFilePath', () => {
	it('appends .lock to the cached path', () => {
		expect(getLockFilePath('/cache/video_abc_720p.mp4')).toBe('/cache/video_abc_720p.mp4.lock');
	});
});

describe('isCached', () => {
	it('returns true when cached file exists and no lock is present', () => {
		expect(isCached(CACHED_PATH, LOCK_PATH, (filePath) => filePath === CACHED_PATH)).toBe(true);
	});

	it('returns false when cached file does not exist', () => {
		expect(isCached(CACHED_PATH, LOCK_PATH, () => false)).toBe(false);
	});

	it('returns false when cached file exists but lock is also present', () => {
		expect(isCached(CACHED_PATH, LOCK_PATH, () => true)).toBe(false);
	});
});

describe('isLockStale', () => {
	it('returns false when the lock file does not exist', () => {
		expect(isLockStale(LOCK_PATH, TWO_HOURS_MS, { exists: () => false })).toBe(false);
	});

	it('returns true when lock content is not valid JSON (old plain-PID format)', () => {
		expect(
			isLockStale(LOCK_PATH, TWO_HOURS_MS, {
				exists: () => true,
				readFile: () => '12345'
			})
		).toBe(true);
	});

	it('returns true when the recorded PID is not alive', () => {
		expect(
			isLockStale(LOCK_PATH, TWO_HOURS_MS, {
				exists: () => true,
				readFile: () => staleLock(),
				isProcessAlive: () => false
			})
		).toBe(true);
	});

	it('returns false when PID is alive and lock is recent (EPERM is treated as alive)', () => {
		const frozenNow = Date.now();
		expect(
			isLockStale(LOCK_PATH, TWO_HOURS_MS, {
				exists: () => true,
				readFile: () => freshLock(),
				isProcessAlive: () => true,
				now: () => frozenNow
			})
		).toBe(false);
	});

	it('returns true when PID appears alive but lock age exceeds maxAgeMs', () => {
		const frozenNow = Date.now();
		expect(
			isLockStale(LOCK_PATH, TWO_HOURS_MS, {
				exists: () => true,
				readFile: () => staleLock(),
				isProcessAlive: () => true,
				now: () => frozenNow
			})
		).toBe(true);
	});
});

describe('cleanStaleLock', () => {
	it('removes the lock file', () => {
		const removeFile = vi.fn();
		cleanStaleLock(LOCK_PATH, OUTPUT_PATH, { removeFile });
		expect(removeFile).toHaveBeenCalledWith(LOCK_PATH);
	});

	it('removes the final output file', () => {
		const removeFile = vi.fn();
		cleanStaleLock(LOCK_PATH, OUTPUT_PATH, { removeFile });
		expect(removeFile).toHaveBeenCalledWith(OUTPUT_PATH);
	});

	it('removes the .incomplete temp file left by a crashed encode', () => {
		const removeFile = vi.fn();
		cleanStaleLock(LOCK_PATH, OUTPUT_PATH, { removeFile });
		expect(removeFile).toHaveBeenCalledWith(`${OUTPUT_PATH}.incomplete`);
	});

	it('calls removeFile exactly three times (lock + output + incomplete)', () => {
		const removeFile = vi.fn();
		cleanStaleLock(LOCK_PATH, OUTPUT_PATH, { removeFile });
		expect(removeFile).toHaveBeenCalledTimes(3);
	});
});
