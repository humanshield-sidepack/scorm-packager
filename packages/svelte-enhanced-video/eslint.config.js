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
	},
	{
		files: ['src/lib/**/*.ts'],
		ignores: ['src/lib/**/*.test.ts', 'src/lib/**/*.spec.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector:
						"ImportDeclaration[source.value^='./']:not([source.value$='.js']), ImportDeclaration[source.value^='../']:not([source.value$='.js']), ExportNamedDeclaration[source.value^='./']:not([source.value$='.js']), ExportNamedDeclaration[source.value^='../']:not([source.value$='.js']), ExportAllDeclaration[source.value^='./']:not([source.value$='.js']), ExportAllDeclaration[source.value^='../']:not([source.value$='.js'])",
					message:
						'Relative runtime imports/exports in src/lib must include a .js extension for Node ESM compatibility.'
				}
			]
		}
	}
];
