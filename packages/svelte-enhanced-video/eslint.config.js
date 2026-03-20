import { svelteConfig } from '@repo/eslint-config/svelte';
import svelteKitConfig from './svelte.config.js';

/** @type {import("eslint").Linter.Config[]} */
export default [
	...svelteConfig,
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				svelteConfig: svelteKitConfig
			}
		}
	},
	{
		files: ['**/*.e2e.ts', '**/*.e2e.js'],
		rules: {
			'unicorn/prevent-abbreviations': 'off'
		}
	}
];
