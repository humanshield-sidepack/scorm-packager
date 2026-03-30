import globals from "globals";
import sveltePlugin from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";
import { config as baseConfig } from "./base.js";
import playwright from "eslint-plugin-playwright";
import unicorn from "eslint-plugin-unicorn";

/**
 * A shared ESLint configuration for Svelte apps.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const svelteConfig = [
	...baseConfig,
	...sveltePlugin.configs["flat/recommended"],
	{
		files: ["tests/e2e/**/*.ts"],
		...playwright.configs["flat/recommended"],
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: [
			"**/*.svelte",
			"**/*.svelte.ts",
			"**/*.svelte.js",
			"**/*.svelte.spec.ts",
		],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
			},
		},
		rules: {
			"unicorn/filename-case": [
				"error",
				{ cases: { pascalCase: true, kebabCase: true } },
			],
			"unicorn/no-null": "off",
		},
	},
	{
		files: ["**/*.svelte"],
		rules: {
			"unicorn/prevent-abbreviations": "off",
			"sonarjs/no-unused-vars": "off",
		},
	},
	{
		files: ["**/app.d.ts"],
		rules: {
			"sonarjs/no-commented-code": "off",
			"unicorn/require-module-specifiers": "off",
		},
	},
	{
		ignores: ["dist/**", ".svelte-kit/**", "build/**", ".vercel/**"],
	},
	{
		files: ["src/lib/utils.ts", "src/lib/components/ui/**", "src/lib/hooks/**"],
		rules: {
			"unicorn/prevent-abbreviations": "off",
			"unicorn/prefer-export-from": "off",
			"unicorn/no-null": "off",
			"unicorn/filename-case": "off",
			"svelte/valid-compile": "off",
			"unicorn/no-document-cookie": "off",
			"sonarjs/pseudo-random": "off",
			"no-magic-numbers": "off",
			"sonarjs/no-use-of-empty-return-value": "off",
			"unicorn/consistent-function-scoping": "off",
			"sonarjs/no-nested-assignment": "off",
		},
	},
];
