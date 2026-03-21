import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import { ensureEncoded } from './development-encoder';
import type { EnsureEncodedOptions } from './encoder';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

const BASE_OPTIONS: EnsureEncodedOptions = {
	inputPath: '/src/video.mp4',
	baseName: 'video',
	hash: 'abc',
	resolution: 720,
	format: 'mp4',
	cacheDirectory: '/cache',
	sourceFps: 24
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

describe('ensureEncoded — stale lock recovery', () => {
	const expectedCachedPath = path.join('/cache', 'video_abc_720p.mp4');
	const expectedLockPath = `${expectedCachedPath}.lock`;
	const expectedTemporaryPath = `${expectedCachedPath}.incomplete`;

	it('proceeds with encoding when lock exists but PID is dead', async () => {
		const encodeAsync = vi.fn().mockResolvedValue();
		const writeLock = vi.fn();
		const removeLock = vi.fn();

		await ensureEncoded(BASE_OPTIONS, {
			exists: (filePath) => filePath === expectedLockPath,
			mkdirSync: vi.fn(),
			readLock: () => staleLock(),
			isProcessAlive: () => false,
			encodeAsync,
			writeLock,
			removeLock,
			removeFile: vi.fn(),
			renameFile: vi.fn(),
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(encodeAsync).toHaveBeenCalledOnce();
	});

	it('cleans up stale lock and incomplete output before re-encoding', async () => {
		const removeLock = vi.fn();

		await ensureEncoded(BASE_OPTIONS, {
			exists: (filePath) => filePath === expectedLockPath,
			mkdirSync: vi.fn(),
			readLock: () => staleLock(),
			isProcessAlive: () => false,
			encodeAsync: vi.fn().mockResolvedValue(),
			writeLock: vi.fn(),
			removeLock,
			removeFile: vi.fn(),
			renameFile: vi.fn(),
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(removeLock).toHaveBeenCalledWith(expectedLockPath);
		expect(removeLock).toHaveBeenCalledWith(expectedCachedPath);
	});

	it('skips encoding when a live lock exists', async () => {
		const encodeAsync = vi.fn();
		const frozenNow = Date.now();

		await ensureEncoded(BASE_OPTIONS, {
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

		await ensureEncoded(BASE_OPTIONS, {
			exists: () => true,
			mkdirSync: vi.fn(),
			encodeAsync,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(encodeAsync).not.toHaveBeenCalled();
	});

	it('writes lock with JSON before encoding and renames temp to final on success', async () => {
		const callOrder: string[] = [];
		const writeLock = vi.fn().mockImplementation(() => {
			callOrder.push('write');
		});
		const removeLock = vi.fn().mockImplementation(() => {
			callOrder.push('remove');
		});
		const renameFile = vi.fn().mockImplementation(() => {
			callOrder.push('rename');
		});

		await ensureEncoded(BASE_OPTIONS, {
			exists: () => false,
			mkdirSync: vi.fn(),
			encodeAsync: vi.fn().mockImplementation(async () => {
				callOrder.push('encode');
			}),
			writeLock,
			removeLock,
			removeFile: vi.fn(),
			renameFile,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(callOrder).toEqual(['write', 'encode', 'rename', 'remove']);
		const [, writtenContent] = writeLock.mock.calls[0] as [string, string];
		expect(() => JSON.parse(writtenContent)).not.toThrow();
		const parsed = JSON.parse(writtenContent) as { pid: number; startedAt: string };
		expect(typeof parsed.pid).toBe('number');
		expect(typeof parsed.startedAt).toBe('string');
		expect(renameFile).toHaveBeenCalledWith(expectedTemporaryPath, expectedCachedPath);
	});

	it('removes lock even when encoding throws', async () => {
		const removeLock = vi.fn();

		await ensureEncoded(BASE_OPTIONS, {
			exists: () => false,
			mkdirSync: vi.fn(),
			encodeAsync: vi.fn().mockRejectedValue(new Error('ffmpeg crashed')),
			writeLock: vi.fn(),
			removeLock,
			removeFile: vi.fn(),
			renameFile: vi.fn(),
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(removeLock).toHaveBeenCalledWith(expectedLockPath);
	});

	it('removes the incomplete temp file when encoding throws', async () => {
		const removeFile = vi.fn();

		await ensureEncoded(BASE_OPTIONS, {
			exists: () => false,
			mkdirSync: vi.fn(),
			encodeAsync: vi.fn().mockRejectedValue(new Error('ffmpeg crashed')),
			writeLock: vi.fn(),
			removeLock: vi.fn(),
			removeFile,
			renameFile: vi.fn(),
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(removeFile).toHaveBeenCalledWith(expectedTemporaryPath);
	});

	it('does not rename the temp file when encoding throws', async () => {
		const renameFile = vi.fn();

		await ensureEncoded(BASE_OPTIONS, {
			exists: () => false,
			mkdirSync: vi.fn(),
			encodeAsync: vi.fn().mockRejectedValue(new Error('ffmpeg crashed')),
			writeLock: vi.fn(),
			removeLock: vi.fn(),
			removeFile: vi.fn(),
			renameFile,
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(renameFile).not.toHaveBeenCalled();
	});

	it('returns the cached path after successful encode', async () => {
		const result = await ensureEncoded(BASE_OPTIONS, {
			exists: () => false,
			mkdirSync: vi.fn(),
			encodeAsync: vi.fn().mockResolvedValue(),
			writeLock: vi.fn(),
			removeLock: vi.fn(),
			removeFile: vi.fn(),
			renameFile: vi.fn(),
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(result).toBe(expectedCachedPath);
	});

	it('returns the cached path on a cache hit without encoding', async () => {
		const result = await ensureEncoded(BASE_OPTIONS, {
			exists: () => true,
			mkdirSync: vi.fn(),
			log: vi.fn(),
			logError: vi.fn()
		});

		expect(result).toBe(expectedCachedPath);
	});
});

describe('ensureEncoded — throwOnError', () => {
	const expectedCachedPath = path.join('/cache', 'video_abc_720p.mp4');

	it('re-throws encoding error when throwOnError is true', async () => {
		await expect(
			ensureEncoded(BASE_OPTIONS, {
				exists: () => false,
				mkdirSync: vi.fn(),
				encodeAsync: vi.fn().mockRejectedValue(new Error('ffmpeg crashed')),
				writeLock: vi.fn(),
				removeLock: vi.fn(),
				removeFile: vi.fn(),
				renameFile: vi.fn(),
				log: vi.fn(),
				logError: vi.fn(),
				throwOnError: true
			})
		).rejects.toThrow('ffmpeg crashed');
	});

	it('does not throw when throwOnError is omitted (dev default)', async () => {
		await expect(
			ensureEncoded(BASE_OPTIONS, {
				exists: () => false,
				mkdirSync: vi.fn(),
				encodeAsync: vi.fn().mockRejectedValue(new Error('ffmpeg crashed')),
				writeLock: vi.fn(),
				removeLock: vi.fn(),
				removeFile: vi.fn(),
				renameFile: vi.fn(),
				log: vi.fn(),
				logError: vi.fn()
			})
		).resolves.toBe(expectedCachedPath);
	});
});
