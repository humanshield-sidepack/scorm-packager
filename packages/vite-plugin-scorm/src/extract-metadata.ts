import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import type { Plugin as EsbuildPlugin, PluginBuild } from 'esbuild'
import type { CourseMetadata } from './types.js'
import { validateCourseMetadata } from './validate.js'

export type AliasEntry = { find: string | RegExp; replacement: string }

const SVELTE_SHIM = 'export default {}'
const SVELTE_NAMESPACE = 'svelte-shim'

function toSourcePath(resolvedPath: string): string {
	const normalized = path.normalize(resolvedPath)
	if (!normalized.endsWith('.js')) return normalized
	const tsCandidate = `${normalized.slice(0, -'.js'.length)}.ts`
	return existsSync(tsCandidate) ? tsCandidate : normalized
}

function resolveAlias(importPath: string, aliases: AliasEntry[]): string | undefined {
	for (const alias of aliases) {
		const { find, replacement } = alias
		if (find instanceof RegExp) {
			if (find.test(importPath)) {
				return toSourcePath(importPath.replace(find, replacement))
			}
		} else if (importPath === find || importPath.startsWith(`${String(find)}/`)) {
			return toSourcePath(importPath.replace(String(find), replacement))
		}
	}

	return undefined
}

function buildAliasPlugin(aliases: AliasEntry[]): EsbuildPlugin {
	return {
		name: 'vite-alias',
		setup(build: PluginBuild) {
			build.onResolve({ filter: /^[^./]/ }, (arguments_) => {
				const resolved = resolveAlias(arguments_.path, aliases)
				if (resolved === undefined) return
				return { path: resolved, namespace: 'file' }
			})
		},
	}
}

function buildSvelteShimPlugin(): EsbuildPlugin {
	return {
		name: 'svelte-shim',
		setup(build: PluginBuild) {
			build.onResolve({ filter: /\.(svelte|svx)(\?.*)?$/ }, (arguments_) => ({
				path: arguments_.path,
				namespace: SVELTE_NAMESPACE,
			}))
			build.onLoad({ filter: /.*/, namespace: SVELTE_NAMESPACE }, () => ({
				contents: SVELTE_SHIM,
				loader: 'js' as const,
			}))
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
	aliases: AliasEntry[],
): Promise<CourseMetadata> {
	const { build } = await import('esbuild')

	const result = await build({
		entryPoints: [courseFilePath],
		bundle: true,
		format: 'esm',
		write: false,
		platform: 'node',
		target: 'node18',
		plugins: [buildAliasPlugin(aliases), buildSvelteShimPlugin()],
	})

	const outputFile = result.outputFiles?.[0]
	if (!outputFile) {
		throw new Error(`esbuild produced no output for: ${courseFilePath}`)
	}

	const rawCourse = await importBundledCourse(outputFile.text, courseFilePath)
	return validateCourseMetadata(rawCourse)
}
