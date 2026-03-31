import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { build, type Plugin as VitePlugin, type ResolvedConfig, type Rollup } from 'vite'
import type { CourseMetadata } from './types.js'
import { validateCourseMetadata } from './validate.js'

const SVELTE_SHIM_PREFIX = '\0svelte-shim:'

function svelteShimPlugin(): VitePlugin {
	return {
		name: 'svelte-shim',
		enforce: 'pre',
		resolveId(source) {
			if (/\.(svelte|svx)(\?.*)?$/.test(source)) {
				return SVELTE_SHIM_PREFIX + source
			}
		},
		load(id) {
			if (id.startsWith(SVELTE_SHIM_PREFIX)) {
				return 'export default {}'
			}
		},
	}
}

async function importBundledCourse(bundledCode: string, courseFilePath: string): Promise<unknown> {
	const hash = crypto.createHash('sha256').update(courseFilePath).digest('hex')
	const temporaryPath = path.join(os.tmpdir(), `scorm-course-${hash}.mjs`)

	try {
		await fs.writeFile(temporaryPath, bundledCode)
		const loaded = await import(pathToFileURL(temporaryPath).href) as Record<string, unknown>
		return loaded['course']
	} finally {
		await fs.rm(temporaryPath, { force: true })
	}
}

export async function extractCourseMetadata(
	courseFilePath: string,
	resolvedConfig: ResolvedConfig,
): Promise<CourseMetadata> {
	const result = await build({
		configFile: false,
		root: resolvedConfig.root,
		resolve: {
			alias: resolvedConfig.resolve.alias,
		},
		plugins: [svelteShimPlugin()],
		build: {
			lib: {
				entry: courseFilePath,
				formats: ['es'],
				fileName: 'course',
			},
			write: false,
			ssr: true,
			rollupOptions: {
				external: [/^node:/, /^[a-z]/],
			},
		},
		logLevel: 'silent',
	})

	const output = Array.isArray(result) ? result[0]! : result as Rollup.RollupOutput
	const chunk = output.output.find(
		(o): o is Rollup.OutputChunk => o.type === 'chunk' && o.isEntry,
	)

	if (!chunk) {
		throw new Error(`Vite build produced no entry chunk for: ${courseFilePath}`)
	}

	const rawCourse = await importBundledCourse(chunk.code, courseFilePath)
	return validateCourseMetadata(rawCourse)
}
