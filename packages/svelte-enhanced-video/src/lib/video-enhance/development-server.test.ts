import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ViteDevServer } from 'vite';
import type { EnsureEncodedOptions } from './encoder';

vi.mock('node:fs', () => {
	const existsSync = vi.fn();
	return { default: { existsSync }, existsSync };
});
vi.mock('./lock', () => ({
	getLockFilePath: vi.fn((filePath: string) => `${filePath}.lock`),
	isLockStale: vi.fn(),
	cleanStaleLock: vi.fn()
}));
vi.mock('./development-encoder', () => ({
	ensureEncoded: vi.fn()
}));
vi.mock('./video-middleware', () => ({ createVideoMiddleware: vi.fn(() => vi.fn()) }));

import { existsSync } from 'node:fs';
import { isLockStale, cleanStaleLock } from './lock';
import { createDevelopmentState, setupDevelopmentServer } from './development-server';

const LOCK_MAX_AGE = 100;
const CACHE_DIR = '/test-cache';

function makeStateOptions() {
	return {
		maxJobs: 2,
		serverReference: {},
		lockMaxAgeMs: LOCK_MAX_AGE,
		warn: vi.fn(),
		log: vi.fn(),
		logError: vi.fn()
	};
}

function makeFakeServer(): ViteDevServer {
	return {
		moduleGraph: { getModuleById: vi.fn(), invalidateModule: vi.fn() },
		hot: { send: vi.fn() },
		httpServer: { once: vi.fn() },
		middlewares: { use: vi.fn() }
	} as unknown as ViteDevServer;
}

function makeFakeServerNoHttp(): ViteDevServer {
	return {
		moduleGraph: { getModuleById: vi.fn(), invalidateModule: vi.fn() },
		hot: { send: vi.fn() },
		httpServer: undefined,
		middlewares: { use: vi.fn() }
	} as unknown as ViteDevServer;
}

describe('createDevelopmentState', () => {
	it('initialises with all collections empty', () => {
		const state = createDevelopmentState(makeStateOptions());
		expect(state.pendingModuleIds.size).toBe(0);
		expect(state.pathStates.size).toBe(0);
		expect(state.originalFiles.size).toBe(0);
	});

	it('initialises encoding queue as idle', () => {
		const state = createDevelopmentState(makeStateOptions());
		expect(state.encodingQueue.isIdle()).toBe(true);
	});

	it('initialises hasWarnedAboutEncoding as false', () => {
		const state = createDevelopmentState(makeStateOptions());
		expect(state.hasWarnedAboutEncoding).toBe(false);
	});

	it('stores the lockMaxAgeMs', () => {
		const state = createDevelopmentState(makeStateOptions());
		expect(state.lockMaxAgeMs).toBe(LOCK_MAX_AGE);
	});

	it('threads warn/log/logError through to state', () => {
		const options = makeStateOptions();
		const state = createDevelopmentState(options);
		state.warn('w');
		state.log('l');
		state.logError('e', new Error('test'));
		expect(options.warn).toHaveBeenCalledWith('w');
		expect(options.log).toHaveBeenCalledWith('l');
		expect(options.logError).toHaveBeenCalled();
	});
});

describe('poll callback (via setupDevelopmentServer)', () => {
	let capturedPoll!: () => void;

	beforeEach(() => {
		vi.mocked(existsSync).mockReturnValue(false);
		vi.mocked(isLockStale).mockReturnValue(false);
		vi.mocked(cleanStaleLock).mockReset();
		vi.spyOn(globalThis, 'setInterval').mockImplementation((callback) => {
			capturedPoll = callback as () => void;
			return 0 as unknown as ReturnType<typeof setInterval>;
		});
	});

	it('does nothing when pathStates is empty', () => {
		const state = createDevelopmentState(makeStateOptions());
		setupDevelopmentServer(makeFakeServer(), CACHE_DIR, state);
		capturedPoll();
		expect(vi.mocked(isLockStale)).not.toHaveBeenCalled();
	});

	it('requeues stale locks and keeps the path in explicit lifecycle state', () => {
		const state = createDevelopmentState(makeStateOptions());
		state.pathStates.set('/cache/video.mp4', {
			phase: 'waiting',
			encodeOptions: {} as EnsureEncodedOptions
		});
		vi.mocked(isLockStale).mockReturnValue(true);
		setupDevelopmentServer(makeFakeServer(), CACHE_DIR, state);
		capturedPoll();
		expect(vi.mocked(cleanStaleLock)).toHaveBeenCalled();
		expect(state.pathStates.get('/cache/video.mp4')?.phase).toBe('encoding');
	});

	it('removes ready paths when lock is gone and file exists', () => {
		const state = createDevelopmentState(makeStateOptions());
		state.pathStates.set('/cache/video.mp4', {
			phase: 'waiting',
			encodeOptions: {} as EnsureEncodedOptions
		});
		vi.mocked(isLockStale).mockReturnValue(false);
		vi.mocked(existsSync).mockImplementation((filePath) => filePath === '/cache/video.mp4');
		setupDevelopmentServer(makeFakeServer(), CACHE_DIR, state);
		capturedPoll();
		expect(state.pathStates.has('/cache/video.mp4')).toBe(false);
	});

	it('triggers a hot reload when a path is ready and the queue is idle', () => {
		const state = createDevelopmentState(makeStateOptions());
		state.pathStates.set('/cache/video.mp4', {
			phase: 'waiting',
			encodeOptions: {} as EnsureEncodedOptions
		});
		vi.mocked(isLockStale).mockReturnValue(false);
		vi.mocked(existsSync).mockImplementation((filePath) => filePath === '/cache/video.mp4');
		const server = makeFakeServer();
		setupDevelopmentServer(server, CACHE_DIR, state);
		capturedPoll();
		expect(vi.mocked(server.hot.send)).toHaveBeenCalledWith({ type: 'full-reload' });
	});

	it('does NOT trigger hot reload when queue is still busy', () => {
		const state = createDevelopmentState(makeStateOptions());
		state.pathStates.set('/cache/video.mp4', {
			phase: 'waiting',
			encodeOptions: {} as EnsureEncodedOptions
		});
		let releaseTask!: () => void;
		state.encodingQueue.enqueue(
			() =>
				new Promise<void>((r) => {
					releaseTask = r;
				})
		);
		vi.mocked(isLockStale).mockReturnValue(false);
		vi.mocked(existsSync).mockImplementation((filePath) => filePath === '/cache/video.mp4');
		const server = makeFakeServer();
		setupDevelopmentServer(server, CACHE_DIR, state);
		capturedPoll();
		expect(vi.mocked(server.hot.send)).not.toHaveBeenCalled();
		releaseTask();
	});
});

describe('setupDevelopmentServer interval cleanup', () => {
	beforeEach(() => {
		vi.spyOn(globalThis, 'setInterval').mockImplementation(() => {
			return 0 as unknown as ReturnType<typeof setInterval>;
		});
	});

	it('registers httpServer close handler when httpServer is present', () => {
		const state = createDevelopmentState(makeStateOptions());
		const server = makeFakeServer();
		setupDevelopmentServer(server, CACHE_DIR, state);
		expect(vi.mocked(server.httpServer!.once)).toHaveBeenCalledWith('close', expect.any(Function));
	});

	it('does not throw when httpServer is absent (middleware mode)', () => {
		const state = createDevelopmentState(makeStateOptions());
		const server = makeFakeServerNoHttp();
		expect(() => setupDevelopmentServer(server, CACHE_DIR, state)).not.toThrow();
	});

	it('sets state.dispose in both standard and middleware mode', () => {
		const stateStandard = createDevelopmentState(makeStateOptions());
		setupDevelopmentServer(makeFakeServer(), CACHE_DIR, stateStandard);
		expect(typeof stateStandard.dispose).toBe('function');

		const stateMiddleware = createDevelopmentState(makeStateOptions());
		setupDevelopmentServer(makeFakeServerNoHttp(), CACHE_DIR, stateMiddleware);
		expect(typeof stateMiddleware.dispose).toBe('function');
	});

	it('state.dispose clears the polling interval', () => {
		const clearSpy = vi.spyOn(globalThis, 'clearInterval');
		const state = createDevelopmentState(makeStateOptions());
		setupDevelopmentServer(makeFakeServerNoHttp(), CACHE_DIR, state);
		state.dispose!();
		expect(clearSpy).toHaveBeenCalled();
	});
});
