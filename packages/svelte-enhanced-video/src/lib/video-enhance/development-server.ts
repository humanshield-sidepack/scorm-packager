import type { ViteDevServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { getLockFilePath } from './encoder';
import type { EnsureEncodedOptions } from './encoder';
import { isLockStale, cleanStaleLock, ensureEncodedAsync } from './encoder-lock';
import { EncodingQueue } from './encoding-queue';
import { createVideoMiddleware } from './video-middleware';
import { EXTERNAL_ENCODE_POLL_MS } from './plugin-types';
import type { DevelopmentLoadState } from './plugin-types';

export interface DevelopmentServerReference {
	current?: ViteDevServer;
}

function triggerReload(developmentServer: ViteDevServer, pendingModuleIds: Set<string>): void {
	for (const id of pendingModuleIds) {
		const module_ = developmentServer.moduleGraph.getModuleById(id);
		if (module_) developmentServer.moduleGraph.invalidateModule(module_);
	}
	pendingModuleIds.clear();
	developmentServer.ws.send({ type: 'full-reload' });
}

function requeueStale(cachedPath: string, state: DevelopmentLoadState): void {
	const lockPath = getLockFilePath(cachedPath);
	const encodeOptions = state.watchedPaths.get(cachedPath);
	cleanStaleLock(lockPath, cachedPath);
	state.watchedPaths.delete(cachedPath);
	if (encodeOptions && !state.inFlightPaths.has(cachedPath)) {
		state.inFlightPaths.add(cachedPath);
		state.encodingQueue.enqueue(async () => {
			await ensureEncodedAsync(encodeOptions, { lockMaxAgeMs: state.lockMaxAgeMs });
			state.inFlightPaths.delete(cachedPath);
		});
	}
}

function createPollCallback(state: DevelopmentLoadState, onReady: () => void): () => void {
	return () => {
		if (state.watchedPaths.size === 0) return;
		let anyReady = false;
		for (const cachedPath of state.watchedPaths.keys()) {
			const lockPath = getLockFilePath(cachedPath);
			if (isLockStale(lockPath, state.lockMaxAgeMs)) {
				requeueStale(cachedPath, state);
			} else if (!fs.existsSync(lockPath) && fs.existsSync(cachedPath)) {
				state.watchedPaths.delete(cachedPath);
				anyReady = true;
			}
		}
		if (anyReady && state.encodingQueue.isIdle()) onReady();
	};
}

export function createDevelopmentState(
	maxJobs: number,
	serverReference: DevelopmentServerReference,
	lockMaxAgeMs: number
): DevelopmentLoadState {
	const pendingModuleIds = new Set<string>();
	const inFlightPaths = new Set<string>();
	const watchedPaths = new Map<string, EnsureEncodedOptions>();
	const originalFiles = new Map<string, string>();
	const encodingQueue = new EncodingQueue(maxJobs, () => {
		if (serverReference.current) triggerReload(serverReference.current, pendingModuleIds);
	});
	return {
		pendingModuleIds,
		inFlightPaths,
		watchedPaths,
		encodingQueue,
		originalFiles,
		lockMaxAgeMs
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
	server.httpServer?.once('close', () => clearInterval(pollInterval));
	return () => {
		server.middlewares.use(createVideoMiddleware(resolvedCacheDirectory, state.originalFiles));
	};
}
