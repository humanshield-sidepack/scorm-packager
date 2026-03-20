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
const command = input?.tool_input?.command ?? '';

const isEslintConfig =
	/eslint\.config\.(js|mjs|cjs|ts)/.test(command) ||
	/packages\/eslint-config\//.test(command);

if (isEslintConfig) {
	process.stdout.write(
		JSON.stringify({
			decision: 'block',
			reason:
				'Running commands that modify ESLint config files is forbidden. This includes eslint.config.{js,mjs,cjs,ts} and all files in packages/eslint-config/.\n\nIf you believe a rule makes your task impossible, report this to the user and explain why.'
		}) + '\n'
	);
} else {
	process.stdout.write(JSON.stringify({ decision: 'approve' }) + '\n');
}
