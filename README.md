# svelte-scorm-packager

A Turborepo monorepo for building SCORM-compliant e-learning courses with Svelte, with tooling for video optimization, packaging, and AI-assisted development.

This project provides a great developer experience for developers who also write courses and are limited by existing tools. Several standalone packages emerged during development and are published separately for wider use.

## Monorepo Structure

```text
.
├── apps/
│   ├── scorm-template/        # Starter SCORM course (Vite + Svelte)
│   └── docs-svelte/           # Documentation site (SvelteKit)
├── packages/
│   ├── vite-plugin-scorm/     # Vite plugin: SCORM ZIP packaging
│   ├── svelte-enhanced-video/ # Vite plugin: multi-resolution video encoding
│   ├── eslint-config/         # Shared ESLint configs (base, svelte, tailwind)
│   ├── eslint-plugin-forbidden-comments/ # ESLint plugin: disallow comments
│   └── typescript-config/     # Shared tsconfig presets
└── .claude/hooks/             # Claude Code hooks for AI code quality
```

Managed with [pnpm workspaces](pnpm-workspace.yaml) and [Turborepo](turbo.json).

## Apps

### [scorm-template](apps/scorm-template/)

A ready-to-use SCORM course template built with Vite + Svelte (no SvelteKit). Includes Tailwind CSS, mdsvex for markdown content, video enhancement, and automatic SCORM packaging on build. Outputs both SCORM 1.2 and SCORM 2004 ZIP files.

**Key dependencies:** `vite-plugin-scorm`, `svelte-enhanced-video`, `sv-router`, `plyr`, `bits-ui`

### [docs-svelte](apps/docs-svelte/)

SvelteKit documentation site with Tailwind CSS, mdsvex, and Vitest browser testing.

## Packages

### [vite-plugin-scorm](packages/vite-plugin-scorm/)

Vite plugin that packages build output into SCORM-compliant ZIP files. Generates `imsmanifest.xml` and bundles everything into distributable `.zip` archives. Supports SCORM 1.2 and SCORM 2004 4th Edition.

See the full [README](packages/vite-plugin-scorm/readme.md) for options, course metadata format, and custom loader support.

### [svelte-enhanced-video](packages/svelte-enhanced-video/)

Vite plugin that transforms `<video:enhanced>` tags in Svelte files into multi-resolution, multi-format `<source>` sets. Uses FFmpeg to encode H.264, VP9, and H.265 variants at configurable resolutions, with disk caching and background encoding in dev mode.

See the full [README](packages/svelte-enhanced-video/README.md) for setup, options, and gotchas.

### [eslint-config](packages/eslint-config/)

Shared ESLint configuration consumed by all apps and packages. Exports preset configs:

- `@repo/eslint-config/base` -- core rules (TypeScript, SonarJS, Unicorn, security, max-lines, no-magic-numbers, no-comments)
- `@repo/eslint-config/svelte` -- Svelte-specific rules
- `@repo/eslint-config/tailwind` -- Tailwind CSS rules

The base config enforces strict limits designed to produce clean, modular code:

| Rule | Limit |
| --- | --- |
| `max-lines` | 250 per file |
| `max-lines-per-function` | 50 per function |
| `no-magic-numbers` | only 0, 1, -1, 2 allowed inline |
| `better-max-params` | 3 params max (6 for constructors) |
| `no-comments/disallowComments` | no comments at all |

These rules are intentionally tight. They force small files, small functions, named constants, and self-documenting code -- which directly improves AI-generated code quality.

### [eslint-plugin-forbidden-comments](packages/eslint-plugin-forbidden-comments/)

Custom ESLint plugin that disallows all comment blocks. See [README](packages/eslint-plugin-forbidden-comments/README.MD).

LLMs tend to litter code with redundant comments (`// initialize the router`, `// return the result`). This plugin prevents that entirely. If code needs a comment to be understood, the code should be refactored instead.

### [typescript-config](packages/typescript-config/)

Shared `tsconfig.json` presets: `base.json`, `node-esm-library.json`, `nextjs.json`, `react-library.json`.

## Claude Code Hooks

The [`.claude/hooks/`](.claude/hooks/) directory contains hooks that run automatically during Claude Code sessions. These are the key mechanism for keeping AI-generated code aligned with project standards.

See the full [hooks README](.claude/hooks/README.md) for registration details and design principles.

### How the hooks work

**Lint-on-write loop** ([lint-loop.mjs](.claude/hooks/lint-loop.mjs)) -- After every `Edit` or `Write` by Claude, ESLint runs on the changed file. If linting fails, Claude is blocked with the errors plus actionable fix hints (e.g., "extract helper functions", "use a named constant"). After 3 consecutive failures on the same file, Claude is forced to stop and report to the user instead of spiraling.

**Fix hints** ([lint-hints.mjs](.claude/hooks/lint-hints.mjs)) -- A mapping of ESLint rule names to plain-English guidance that tells Claude *how* to fix each violation correctly (refactor, extract, rename) rather than suppressing it. Falls back to a generic "refactor to comply, don't suppress" hint for unknown rules.

**ESLint config protection** ([protect-eslint.mjs](.claude/hooks/protect-eslint.mjs), [protect-eslint-bash.mjs](.claude/hooks/protect-eslint-bash.mjs)) -- Claude is completely blocked from modifying any `eslint.config.*` file or anything in `packages/eslint-config/`. This prevents the most common LLM escape hatch: weakening lint rules instead of fixing the code.

### Why this matters for AI-assisted development

Without guardrails, LLMs will:

- Add `// eslint-disable-next-line` to silence errors
- Weaken or remove lint rules that block them
- Write 300-line functions with magic numbers and commented-out code
- Retry the same broken approach indefinitely

The hooks close these escape hatches. The tight ESLint rules force Claude to write small, modular, self-documenting code. The config protection ensures those rules stay in place. The lint loop catches violations immediately rather than letting them accumulate. The attempt counter prevents infinite retry spirals.

The result: Claude produces code that matches the same standards a human would enforce in code review.

## Getting Started

```sh
# Install dependencies
pnpm install

# Dev (all apps/packages)
pnpm dev

# Build everything
pnpm build

# Lint
pnpm lint

# Type check
pnpm check-types
```

Requires Node >= 18 and pnpm 10.x (`packageManager` is pinned in `package.json`).
