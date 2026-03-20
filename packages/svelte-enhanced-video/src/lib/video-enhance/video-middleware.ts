import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, createReadStream } from 'node:fs';
import path from 'node:path';

const HTTP_FORBIDDEN = 403;

const MIME = new Map<string, string>([
	['mp4', 'video/mp4'],
	['webm', 'video/webm'],
	['mov', 'video/quicktime']
]);

const PREFIX = '/_enhanced-video/';

export function createVideoMiddleware(
	resolvedCacheDirectory: string,
	originalFiles: Map<string, string> = new Map()
) {
	return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
		if (!request.url?.startsWith(PREFIX)) {
			next();
			return;
		}
		const fileName = decodeURIComponent(request.url.slice(PREFIX.length));
		const filePath = path.join(resolvedCacheDirectory, fileName);
		if (!filePath.startsWith(resolvedCacheDirectory)) {
			response.statusCode = HTTP_FORBIDDEN;
			response.end('Forbidden');
			return;
		}
		if (existsSync(filePath)) {
			const extension = path.extname(filePath).slice(1);
			response.setHeader('Content-Type', MIME.get(extension) ?? 'application/octet-stream');
			createReadStream(filePath).pipe(response);
			return;
		}
		const originalPath = originalFiles.get(fileName);
		if (originalPath !== undefined) {
			const extension = path.extname(originalPath).slice(1);
			response.setHeader('Content-Type', MIME.get(extension) ?? 'application/octet-stream');
			createReadStream(originalPath).pipe(response);
			return;
		}
		next();
	};
}
