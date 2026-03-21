import { pathToFileURL } from 'node:url';
import path from 'node:path';

const distributionEntry = path.resolve(process.cwd(), 'dist/index.js');

try {
	await import(pathToFileURL(distributionEntry).href);
	console.log(`[svelte-enhanced-video] dist import check passed: ${distributionEntry}`);
} catch (error) {
	console.error(`[svelte-enhanced-video] dist import check failed: ${distributionEntry}`);
	throw error;
}
