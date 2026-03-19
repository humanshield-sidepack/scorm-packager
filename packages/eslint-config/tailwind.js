import tailwind from "eslint-plugin-tailwindcss";

/**
 * A shared ESLint configuration for Svelte apps.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const tailwindConfig = [...tailwind.configs["flat/recommended"]];
