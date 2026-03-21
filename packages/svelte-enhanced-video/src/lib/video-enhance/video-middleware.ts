import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, createReadStream, statSync } from 'node:fs';
import path from 'node:path';

const HTTP_OK = 200;
const HTTP_PARTIAL = 206;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_SATISFIABLE = 416;

const MIME = new Map<string, string>([
	['mp4', 'video/mp4'],
	['webm', 'video/webm'],
	['mov', 'video/quicktime']
]);

const PREFIX = '/_enhanced-video/';

function getMimeType(filePath: string): string {
	const extension = path.extname(filePath).slice(1);
	return MIME.get(extension) ?? 'application/octet-stream';
}

function parseRangeHeader(
	rangeHeader: string,
	fileSize: number
): { start: number; end: number } | undefined {
	const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
	if (!match) return undefined;
	const start = match[1] ? Number(match[1]) : fileSize - Number(match[2]);
	const end = match[2] ? Number(match[2]) : fileSize - 1;
	if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || end >= fileSize) {
		return undefined;
	}
	return { start, end };
}

function serveFile(filePath: string, request: IncomingMessage, response: ServerResponse): void {
	const stat = statSync(filePath);
	const fileSize = stat.size;
	const mimeType = getMimeType(filePath);
	const rangeHeader = request.headers['range'];

	response.setHeader('Accept-Ranges', 'bytes');
	response.setHeader('Content-Type', mimeType);

	if (request.method === 'HEAD') {
		response.setHeader('Content-Length', fileSize);
		response.statusCode = HTTP_OK;
		response.end();
		return;
	}

	if (rangeHeader) {
		const range = parseRangeHeader(rangeHeader, fileSize);
		if (!range) {
			response.setHeader('Content-Range', `bytes */${fileSize}`);
			response.statusCode = HTTP_NOT_SATISFIABLE;
			response.end();
			return;
		}
		const chunkSize = range.end - range.start + 1;
		response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);
		response.setHeader('Content-Length', chunkSize);
		response.statusCode = HTTP_PARTIAL;
		createReadStream(filePath, { start: range.start, end: range.end }).pipe(response);
		return;
	}

	response.setHeader('Content-Length', fileSize);
	response.statusCode = HTTP_OK;
	createReadStream(filePath).pipe(response);
}

export function createVideoMiddleware(
	resolvedCacheDirectory: string,
	originalFiles: Map<string, string> = new Map()
) {
	return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
		if (!request.url?.startsWith(PREFIX)) {
			next();
			return;
		}

		if (request.method !== 'GET' && request.method !== 'HEAD') {
			next();
			return;
		}

		const fileName = decodeURIComponent(request.url.slice(PREFIX.length));

		if (fileName.includes('\0') || fileName.includes('..')) {
			response.statusCode = HTTP_BAD_REQUEST;
			response.end('Bad Request');
			return;
		}

		const filePath = path.join(resolvedCacheDirectory, fileName);
		if (
			!filePath.startsWith(resolvedCacheDirectory + path.sep) &&
			filePath !== resolvedCacheDirectory
		) {
			response.statusCode = HTTP_FORBIDDEN;
			response.end('Forbidden');
			return;
		}

		if (existsSync(filePath)) {
			serveFile(filePath, request, response);
			return;
		}

		const originalPath = originalFiles.get(fileName);
		if (originalPath !== undefined) {
			serveFile(originalPath, request, response);
			return;
		}

		next();
	};
}
