import type { ViteDevServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { ensureEncoded } from './development-encoder';
import { getLockFilePath, isLockStale, cleanStaleLock } from './lock';
import { EncodingQueue } from './encoding-queue';
import { createVideoMiddleware } from './video-middleware';
import { EXTERNAL_ENCODE_POLL_MS } from './plugin-types';
import type { DevelopmentLoadState, EncodingPathState } from './plugin-types';

export interface DevelopmentServerReference {
	current?: ViteDevServer;
}

function triggerReload(developmentServer: ViteDevServer, pendingModuleIds: Set<string>): void {
	for (const id of pendingModuleIds) {
		const module_ = developmentServer.moduleGraph.getModuleById(id);
		if (module_) developmentServer.moduleGraph.invalidateModule(module_);
	}
	pendingModuleIds.clear();
	developmentServer.hot.send({ type: 'full-reload' });
}

function requeueStaleLockPath(cachedPath: string, state: DevelopmentLoadState): void {
	const lockPath = getLockFilePath(cachedPath);
	const pathState = state.pathStates.get(cachedPath);
	cleanStaleLock(lockPath, cachedPath);
	if (pathState) {
		state.pathStates.set(cachedPath, { phase: 'encoding', encodeOptions: pathState.encodeOptions });
		state.encodingQueue.enqueue(async () => {
			await ensureEncoded(pathState.encodeOptions, {
				lockMaxAgeMs: state.lockMaxAgeMs,
				log: state.log,
				logError: state.logError
			});
			state.pathStates.set(cachedPath, {
				phase: 'waiting',
				encodeOptions: pathState.encodeOptions
			});
		});
	}
}

function createPollCallback(state: DevelopmentLoadState, onReady: () => void): () => void {
	return () => {
		if (state.pathStates.size === 0) return;
		let anyReady = false;
		for (const [cachedPath, pathState] of state.pathStates.entries()) {
			if (pathState.phase !== 'waiting') continue;

			const lockPath = getLockFilePath(cachedPath);
			if (isLockStale(lockPath, state.lockMaxAgeMs)) {
				requeueStaleLockPath(cachedPath, state);
			} else if (!fs.existsSync(lockPath) && fs.existsSync(cachedPath)) {
				state.pathStates.delete(cachedPath);
				anyReady = true;
			}
		}
		if (anyReady && state.encodingQueue.isIdle()) onReady();
	};
}

export interface CreateDevelopmentStateOptions {
	maxJobs: number;
	serverReference: DevelopmentServerReference;
	lockMaxAgeMs: number;
	warn: (message: string) => void;
	log: (message: string) => void;
	logError: (message: string, error: unknown) => void;
}

export function createDevelopmentState(
	options: CreateDevelopmentStateOptions
): DevelopmentLoadState {
	const { maxJobs, serverReference, lockMaxAgeMs, warn, log, logError } = options;
	const pendingModuleIds = new Set<string>();
	const pathStates = new Map<string, EncodingPathState>();
	const originalFiles = new Map<string, string>();
	const encodingQueue = new EncodingQueue(
		maxJobs,
		() => {
			if (serverReference.current) triggerReload(serverReference.current, pendingModuleIds);
		},
		logError
	);
	return {
		pendingModuleIds,
		pathStates,
		encodingQueue,
		originalFiles,
		lockMaxAgeMs,
		hasWarnedAboutEncoding: false,
		warn,
		log,
		logError
	};
}

export function setupDevelopmentServer(
	server: ViteDevServer,
	cacheDirectory: string,
	state: DevelopmentLoadState
): () => void {
	const resolvedCacheDirectory = path.resolve(cacheDirectory);
	const onReady = () => triggerReload(server, state.pendingModuleIds);
	const poll = createPollCallback(state, onReady);
	const pollInterval = setInterval(poll, EXTERNAL_ENCODE_POLL_MS);
	const dispose = () => clearInterval(pollInterval);
	state.dispose = dispose;
	if (server.httpServer) {
		server.httpServer.once('close', dispose);
	}
	return () => {
		server.middlewares.use(createVideoMiddleware(resolvedCacheDirectory, state.originalFiles));
	};
}
