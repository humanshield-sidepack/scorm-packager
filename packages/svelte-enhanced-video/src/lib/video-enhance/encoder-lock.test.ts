import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { isLockStale, cleanStaleLock, ensureEncodedAsync } from './encoder-lock';
import type { EnsureEncodedOptions } from './encoder';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const LOCK_PATH = '/cache/video_abc_720p.mp4.lock';
const OUTPUT_PATH = '/cache/video_abc_720p.mp4';

const BASE_OPTIONS: EnsureEncodedOptions = {
	inputPath: '/src/video.mp4',
	baseName: 'video',
	hash: 'abc',
	resolution: 720,
	format: 'mp4',
	cacheDirectory: '/cache'
};

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

	it('removes the incomplete output file', () => {
		const removeFile = vi.fn();
		cleanStaleLock(LOCK_PATH, OUTPUT_PATH, { removeFile });
		expect(removeFile).toHaveBeenCalledWith(OUTPUT_PATH);
	});

	it('calls removeFile exactly twice (lock + output)', () => {
		const removeFile = vi.fn();
		cleanStaleLock(LOCK_PATH, OUTPUT_PATH, { removeFile });
		expect(removeFile).toHaveBeenCalledTimes(2);
	});
});

describe('ensureEncodedAsync — stale lock recovery', () => {
	const expectedCachedPath = path.join('/cache', 'video_abc_720p.mp4');
	const expectedLockPath = `${expectedCachedPath}.lock`;

	it('proceeds with encoding when lock exists but PID is dead', async () => {
		const encodeAsync = vi.fn().mockResolvedValue();
		const writeLock = vi.fn();
		const removeLock = vi.fn();

		await ensureEncodedAsync(BASE_OPTIONS, {
			exists: (filePath) => filePath === expectedLockPath,
			mkdirSync: vi.fn(),
			readLock: () => staleLock(),
			isProcessAlive: () => false,
			encodeAsync,
			writeLock,
			removeLock,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(encodeAsync).toHaveBeenCalledOnce();
	});

	it('cleans up stale lock and incomplete output before re-encoding', async () => {
		const removeLock = vi.fn();

		await ensureEncodedAsync(BASE_OPTIONS, {
			exists: (filePath) => filePath === expectedLockPath,
			mkdirSync: vi.fn(),
			readLock: () => staleLock(),
			isProcessAlive: () => false,
			encodeAsync: vi.fn().mockResolvedValue(),
			writeLock: vi.fn(),
			removeLock,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(removeLock).toHaveBeenCalledWith(expectedLockPath);
		expect(removeLock).toHaveBeenCalledWith(expectedCachedPath);
	});

	it('skips encoding when a live lock exists', async () => {
		const encodeAsync = vi.fn();
		const frozenNow = Date.now();

		await ensureEncodedAsync(BASE_OPTIONS, {
			exists: (filePath) => filePath === expectedLockPath,
			mkdirSync: vi.fn(),
			readLock: () => freshLock(),
			isProcessAlive: () => true,
			now: () => frozenNow,
			lockMaxAgeMs: TWO_HOURS_MS,
			encodeAsync,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(encodeAsync).not.toHaveBeenCalled();
	});

	it('skips encoding when output file already exists', async () => {
		const encodeAsync = vi.fn();

		await ensureEncodedAsync(BASE_OPTIONS, {
			exists: () => true,
			mkdirSync: vi.fn(),
			encodeAsync,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(encodeAsync).not.toHaveBeenCalled();
	});

	it('writes lock with JSON before encoding and removes it after', async () => {
		const callOrder: string[] = [];
		const writeLock = vi.fn().mockImplementation(() => {
			callOrder.push('write');
		});
		const removeLock = vi.fn().mockImplementation(() => {
			callOrder.push('remove');
		});

		await ensureEncodedAsync(BASE_OPTIONS, {
			exists: () => false,
			mkdirSync: vi.fn(),
			encodeAsync: vi.fn().mockImplementation(async () => {
				callOrder.push('encode');
			}),
			writeLock,
			removeLock,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(callOrder).toEqual(['write', 'encode', 'remove']);
		const [, writtenContent] = writeLock.mock.calls[0] as [string, string];
		expect(() => JSON.parse(writtenContent)).not.toThrow();
		const parsed = JSON.parse(writtenContent) as { pid: number; startedAt: string };
		expect(typeof parsed.pid).toBe('number');
		expect(typeof parsed.startedAt).toBe('string');
	});

	it('removes lock even when encoding throws', async () => {
		const removeLock = vi.fn();

		await ensureEncodedAsync(BASE_OPTIONS, {
			exists: () => false,
			mkdirSync: vi.fn(),
			encodeAsync: vi.fn().mockRejectedValue(new Error('ffmpeg crashed')),
			writeLock: vi.fn(),
			removeLock,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(removeLock).toHaveBeenCalledWith(expectedLockPath);
	});
});
