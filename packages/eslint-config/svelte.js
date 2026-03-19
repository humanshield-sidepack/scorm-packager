import globals from "globals";
import sveltePlugin from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";
import { config as baseConfig } from "./base.js";
import playwright from "eslint-plugin-playwright";

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
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js", "**/*.svelte.spec.ts"],
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
		ignores: ["dist/**", ".svelte-kit/**", "build/**"],
	},
];
