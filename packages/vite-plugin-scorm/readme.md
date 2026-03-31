# vite-plugin-scorm

A Vite plugin that packages your build output into SCORM-compliant ZIP files. Supports SCORM 1.2 and SCORM 2004 (4th Edition).

## Install

```bash
npm install vite-plugin-scorm
```

## Install fflate

The plugin uses `fflate` for ZIP generation. Install it as a peer dependency:

```bash
npm install -D fflate@^0.8.2
```

Requires `vite >= 5.0.0` as a peer dependency.

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { scormPackager } from "vite-plugin-scorm";

export default defineConfig({
	plugins: [
		scormPackager({
			courseFile: "src/course.ts",
			target: "both",
		}),
	],
});
```

After `vite build`, SCORM ZIP packages are written to `scorm-packages/` (by default).

## Options

| Option       | Type                                        | Default                | Description                                           |
| ------------ | ------------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `courseFile` | `string`                                    | `'src/course.ts'`      | Path to course definition file, relative to Vite root |
| `entry`      | `string`                                    | `'index.html'`         | Entry HTML filename in the build output               |
| `target`     | `'1.2' \| '2004' \| 'both'`                 | `'both'`               | SCORM version(s) to generate                          |
| `outputDir`  | `string`                                    | `'scorm-packages'`     | Output directory for ZIPs, relative to project root   |
| `loadCourse` | `(root: string) => Promise<CourseMetadata>` | Built-in Svelte loader | Custom course metadata loader                         |

## Course Metadata

The plugin reads course metadata from your course definition file. It expects a named export `course` with this shape:

```ts
type CourseMetadata = {
	id: string; // Unique course identifier
	title: string; // Course title
	description?: string; // Optional description
	masteryScore?: number; // Pass threshold 0–100 (SCORM 1.2 only)
	minScore: number; // Minimum possible score
	maxScore: number; // Maximum possible score
};
```

All fields are validated at build time. `id`, `title`, `minScore`, and `maxScore` are required. `masteryScore` must be between 0 and 100 if provided.

## Custom Course Loader

By default, the plugin uses Vite's build API to bundle and evaluate the course file. This works with Svelte projects out of the box (`.svelte` and `.svx` imports are shimmed).

For non-Svelte projects or custom setups, provide a `loadCourse` function:

```ts
scormPackager({
	loadCourse: async (root) => ({
		id: "my-course",
		title: "My Course",
		minScore: 0,
		maxScore: 100,
	}),
});
```

## Output

The plugin runs during the `closeBundle` hook. For each target version, it:

1. Generates an `imsmanifest.xml` conforming to the SCORM spec
2. Bundles the manifest with all files from the build output into a ZIP
3. Writes the ZIP to `{outputDir}/{slugified-course-id}-{suffix}.zip`

With `target: 'both'`, you get two files: `*-scorm12.zip` and `*-scorm2004.zip`.

## Limitations

- Only SCORM 1.2 and SCORM 2004 4th Edition are supported
- Single SCO per package (one organization, one item)
- No sequencing or navigation rules in the manifest
- All build output files are included — no selective file inclusion/exclusion
- `masteryScore` is only written to the SCORM 1.2 manifest
- Course metadata is static (defined at build time)

## Exports

```ts
// Main plugin
import { scormPackager } from "vite-plugin-scorm";

// Types
import type {
	ScormPackagerOptions,
	CourseMetadata,
	DistributionFile,
	FormatHandler,
	FormatRegistry,
	FormatContext,
	FormatResult,
} from "vite-plugin-scorm";
```
