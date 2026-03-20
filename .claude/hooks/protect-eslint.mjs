#!/usr/bin/env node
import { readFileSync } from 'node:fs';

let raw = '';
try {
	raw = readFileSync(0, 'utf8');
} catch {
	process.stdout.write(JSON.stringify({ decision: 'approve' }) + '\n');
	process.exit(0);
}

const input = JSON.parse(raw);
const filePath = (input?.tool_input?.file_path ?? '').replaceAll('\\', '/');
const filename = filePath.split('/').at(-1) ?? '';

const isEslintConfig =
	/^eslint\.config\.(js|mjs|cjs|ts)$/.test(filename) ||
	filePath.includes('packages/eslint-config/');

if (isEslintConfig) {
	process.stdout.write(
		JSON.stringify({
			decision: 'block',
			reason:
				'Modifying ESLint config files is forbidden. This includes eslint.config.{js,mjs,cjs,ts} and all files in packages/eslint-config/.\n\nIf you believe a rule makes your task impossible, report this to the user and explain why.'
		}) + '\n'
	);
} else {
	process.stdout.write(JSON.stringify({ decision: 'approve' }) + '\n');
}
