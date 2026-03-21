import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';

vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	statSync: vi.fn(),
	createReadStream: vi.fn()
}));

import { existsSync, statSync, createReadStream } from 'node:fs';
import { createVideoMiddleware } from './video-middleware';

const CACHE_DIR = path.resolve('/test-cache');
const FILE_SIZE = 1000;

function makeRequest(
	url: string,
	options: { method?: string; range?: string } = {}
): IncomingMessage {
	const headers: Record<string, string> = {};
	if (options.range) headers['range'] = options.range;
	return { url, method: options.method ?? 'GET', headers } as unknown as IncomingMessage;
}

function makeResponse(): ServerResponse {
	return {
		statusCode: 0,
		setHeader: vi.fn(),
		end: vi.fn()
	} as unknown as ServerResponse;
}

beforeEach(() => {
	vi.mocked(existsSync).mockReturnValue(false);
	vi.mocked(statSync).mockReturnValue({ size: FILE_SIZE } as ReturnType<typeof statSync>);
	vi.mocked(createReadStream).mockReturnValue({
		pipe: vi.fn()
	} as unknown as ReturnType<typeof createReadStream>);
});

describe('createVideoMiddleware — routing', () => {
	const middleware = createVideoMiddleware(CACHE_DIR);

	it('passes to next() for URLs outside /_enhanced-video/', () => {
		const next = vi.fn();
		middleware(makeRequest('/assets/video.mp4'), makeResponse(), next);
		expect(next).toHaveBeenCalledOnce();
	});

	it('passes to next() for non-GET/HEAD methods', () => {
		const next = vi.fn();
		middleware(makeRequest('/_enhanced-video/video.mp4', { method: 'POST' }), makeResponse(), next);
		expect(next).toHaveBeenCalledOnce();
	});

	it('passes to next() when file is absent and not in originalFiles', () => {
		const next = vi.fn();
		middleware(makeRequest('/_enhanced-video/missing.mp4'), makeResponse(), next);
		expect(next).toHaveBeenCalledOnce();
	});
});

describe('createVideoMiddleware — path-traversal guard', () => {
	const middleware = createVideoMiddleware(CACHE_DIR);

	it('returns 400 for a filename containing a null byte', () => {
		const response = makeResponse();
		middleware(makeRequest('/_enhanced-video/vid\0eo.mp4'), response, vi.fn());
		expect(response.statusCode).toBe(400);
	});

	it('returns 400 for a filename containing ..', () => {
		const response = makeResponse();
		middleware(makeRequest('/_enhanced-video/../secret.mp4'), response, vi.fn());
		expect(response.statusCode).toBe(400);
	});

	it('returns 400 for URL-encoded .. (%2e%2e)', () => {
		const response = makeResponse();
		middleware(makeRequest('/_enhanced-video/%2e%2e/secret.mp4'), response, vi.fn());
		expect(response.statusCode).toBe(400);
	});
});

describe('createVideoMiddleware — serving cached files', () => {
	const middleware = createVideoMiddleware(CACHE_DIR);

	it('returns 200 for a file that exists in cache', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		const response = makeResponse();
		middleware(makeRequest('/_enhanced-video/video.mp4'), response, vi.fn());
		expect(response.statusCode).toBe(200);
	});

	it('sets the correct Content-Type for mp4', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		const response = makeResponse();
		middleware(makeRequest('/_enhanced-video/video.mp4'), response, vi.fn());
		expect(vi.mocked(response.setHeader)).toHaveBeenCalledWith('Content-Type', 'video/mp4');
	});

	it('sets the correct Content-Type for webm', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		const response = makeResponse();
		middleware(makeRequest('/_enhanced-video/video.webm'), response, vi.fn());
		expect(vi.mocked(response.setHeader)).toHaveBeenCalledWith('Content-Type', 'video/webm');
	});
});

describe('createVideoMiddleware — originalFiles fallback', () => {
	it('serves from originalFiles when the cached file is absent', () => {
		const originalFiles = new Map([['demo.mp4', '/src/demo.mp4']]);
		const middleware = createVideoMiddleware(CACHE_DIR, originalFiles);
		vi.mocked(existsSync).mockReturnValue(false);
		const response = makeResponse();
		middleware(makeRequest('/_enhanced-video/demo.mp4'), response, vi.fn());
		expect(response.statusCode).toBe(200);
		expect(vi.mocked(createReadStream)).toHaveBeenCalledWith('/src/demo.mp4');
	});
});

describe('createVideoMiddleware — range requests', () => {
	const middleware = createVideoMiddleware(CACHE_DIR);

	beforeEach(() => {
		vi.mocked(existsSync).mockReturnValue(true);
	});

	it('returns 206 for a valid range request', () => {
		const response = makeResponse();
		middleware(
			makeRequest('/_enhanced-video/video.mp4', { range: 'bytes=0-99' }),
			response,
			vi.fn()
		);
		expect(response.statusCode).toBe(206);
	});

	it('sets Content-Range header for a valid range', () => {
		const response = makeResponse();
		middleware(
			makeRequest('/_enhanced-video/video.mp4', { range: 'bytes=0-99' }),
			response,
			vi.fn()
		);
		expect(vi.mocked(response.setHeader)).toHaveBeenCalledWith(
			'Content-Range',
			`bytes 0-99/${FILE_SIZE}`
		);
	});

	it('returns 416 for a range where start > end', () => {
		const response = makeResponse();
		middleware(
			makeRequest('/_enhanced-video/video.mp4', { range: 'bytes=500-100' }),
			response,
			vi.fn()
		);
		expect(response.statusCode).toBe(416);
	});

	it('returns 416 for a range that exceeds file size', () => {
		const response = makeResponse();
		middleware(
			makeRequest('/_enhanced-video/video.mp4', { range: `bytes=0-${FILE_SIZE}` }),
			response,
			vi.fn()
		);
		expect(response.statusCode).toBe(416);
	});

	it('returns 416 for a suffix range (bytes=-N) not matching the regex', () => {
		const response = makeResponse();
		middleware(
			makeRequest('/_enhanced-video/video.mp4', { range: 'bytes=-200' }),
			response,
			vi.fn()
		);
		expect(response.statusCode).toBe(416);
	});
});
