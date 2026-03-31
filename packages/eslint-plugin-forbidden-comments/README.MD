# eslint-plugin-forbidden-comments

Prevents leaving comment blocks in source files. Designed for projects where comments should not reach production — e.g. when code is not processed by a bundler.

## Why?

Without a bundler stripping comments, notes, commented-out code blocks, or sensitive information can leak into production.

### LLM-generated code

LLMs produce excessive, low-value comments (`// initialize the array`, `// return the result`, `// handle error`). Prompt instructions like "don't write comments" work initially, but LLM context windows are finite -- when the conversation grows long enough to trigger memory compaction, those instructions are among the first to be discarded, and the LLM reverts to its default commenting habits. An ESLint rule is a hard constraint that cannot be forgotten, compacted away, or ignored. Every comment triggers a lint error that the LLM must resolve by making the code self-documenting instead.

## Installation

```sh
npm install --save-dev eslint-plugin-forbidden-comments
# or
pnpm add -D eslint-plugin-forbidden-comments
```

## Usage

### ESLint 9 flat config

```js
import forbiddenComments from "eslint-plugin-forbidden-comments";

export default [
	{
		plugins: { "forbidden-comments": forbiddenComments },
		rules: {
			"forbidden-comments/disallowComments": "error",
		},
	},
];
```

## Options

All options default to `true` (allowed). Set to `false` to explicitly forbid that comment type.

```js
"forbidden-comments/disallowComments": ["error", {
  allowJSDoc: true,               // /** ... */ — allowed by default
  allowTODO: true,                // // TODO: ... — allowed by default
  allowFIXME: true,               // // FIXME: ... — allowed by default
  allowSvelteHTMLComments: true,  // <!-- ... --> in .svelte files — allowed by default
  allow: ["eslint", "global"],    // custom regex patterns — always checked
}]
```

### `allowJSDoc`

When `true` (default), block comments starting with `*` are allowed:

```js
/** This JSDoc comment is allowed */
function greet(name) {}
```

Set to `false` to forbid JSDoc comments too.

### `allowTODO`

When `true` (default), comments matching `TODO:` (case-insensitive) are allowed in both line and block style:

```js
// TODO: fix this later
/* TODO: refactor */
```

### `allowFIXME`

When `true` (default), comments matching `FIXME:` (case-insensitive) are allowed:

```js
// FIXME: broken on edge case
```

### `allowSvelteHTMLComments`

When `true` (default), HTML comments in Svelte templates are allowed:

```html
<!-- This section renders the hero -->
<section>...</section>
```

Set to `false` to forbid them:

```js
"forbidden-comments/disallowComments": ["error", { allowSvelteHTMLComments: false }]
```

### `allow`

Array of regex pattern strings. A comment matching any pattern is allowed. Defaults to permitting `eslint` and `global` directive comments regardless of this option.

```js
{
	allow: ["eslint", "global", "copyright"];
}
```

## Rule details

### Fail

```js
// import { foo } from './foo'
const { foo } = require("./foo");
```

```js
/* var price1 = 5;
 * var price2 = 6;
 */
```

```js
const client = require("cool-package"); // TO-DO fix vulnerability
```

```html
<!-- TODO this would pass since allowTODO defaults to true -->
<!-- but this plain comment would fail -->
<div>...</div>
```

### Pass

```js
// eslint-disable-next-line no-unused-vars
/* global MyClass */
```

```js
/** @param {string} name */
function greet(name) {}
```

```js
// TODO: address before release
// FIXME: edge case on Safari
```

## MIT License
