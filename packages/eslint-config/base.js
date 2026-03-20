import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import noComments from "eslint-plugin-forbidden-comments";
import betterParams from "eslint-plugin-better-max-params";

import { configs as sonarjsConfigs } from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import security from "eslint-plugin-security";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
	js.configs.recommended,
	eslintConfigPrettier,
	...tseslint.configs.recommended,
	sonarjsConfigs.recommended,
	unicorn.configs["recommended"],
	security.configs.recommended,
	{
		plugins: {
			turbo: turboPlugin,
		},
		rules: {
			"turbo/no-undeclared-env-vars": "warn",
		},
	},
	{
		plugins: { "no-comments": noComments },
		rules: {
			"no-comments/disallowComments": "error",
		},
	},
	{
		plugins: { "better-max-params": betterParams },
		rules: {
			"better-max-params/better-max-params": [
				"error",
				{
					func: 3,
					constructor: 6,
				},
			],
		},
	},
	{
		ignores: ["dist/**"],
	},
	{
		rules: {
			"max-lines-per-function": ["error", { max: 50, skipBlankLines: true }],
			"max-lines": ["error", { max: 250, skipBlankLines: true }],
			"no-magic-numbers": [
				"error",
				{
					detectObjects: false,
					enforceConst: true,
					ignore: [0, 1, -1, 2],
					ignoreArrayIndexes: true,
				},
			],
		},
		ignores: ["**/*.spec.ts", "**/*.test.ts"],
	},
];
