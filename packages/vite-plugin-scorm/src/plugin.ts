import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ScormPackagerOptions } from './types.js'
import { extractCourseMetadata } from './extract-metadata.js'
import { collectDistributionFiles } from './collect-files.js'
import { buildZip } from './zip-builder.js'
import { scorm12Handler } from './formats/scorm12.js'
import { scorm2004Handler } from './formats/scorm2004.js'
import { createFormatRegistry } from './formats/index.js'

const DEFAULT_COURSE_FILE = 'src/course.ts'
const DEFAULT_ENTRY = 'index.html'
const DEFAULT_OUTPUT_DIR = 'scorm-packages'

function resolveVersions(target: ScormPackagerOptions['target']): string[] {
	if (target === '1.2') return ['1.2']
	if (target === '2004') return ['2004']
	return ['1.2', '2004']
}

async function ensureExists(filePath: string, message: string): Promise<void> {
	try {
		await fs.access(filePath)
	} catch {
		throw new Error(message)
	}
}

export function scormPackager(userOptions: ScormPackagerOptions = {}): Plugin {
	let resolvedConfig: ResolvedConfig

	return {
		name: 'vite-plugin-scorm',
		apply: 'build',

		configResolved(config) {
			resolvedConfig = config
		},

		async closeBundle() {
			const courseFile = userOptions.courseFile ?? DEFAULT_COURSE_FILE
			const entry = userOptions.entry ?? DEFAULT_ENTRY
			const outputDirectory = userOptions.outputDir ?? DEFAULT_OUTPUT_DIR

			const root = resolvedConfig.root
			const distributionDirectory = path.resolve(root, resolvedConfig.build.outDir ?? 'dist')
			const courseFilePath = path.resolve(root, courseFile)
			const outputDirectoryPath = path.resolve(root, outputDirectory)

			await ensureExists(distributionDirectory, `Build output not found at: ${distributionDirectory}`)
			await ensureExists(courseFilePath, `Course file not found at: ${courseFilePath}`)

			const metadata = userOptions.loadCourse
				? await userOptions.loadCourse(root)
				: await extractCourseMetadata(courseFilePath, resolvedConfig)

			await ensureExists(
				path.join(distributionDirectory, entry),
				`Entry "${entry}" not found in build output.`,
			)

			const distributionFiles = await collectDistributionFiles(distributionDirectory)

			const registry = createFormatRegistry()
			registry.set('1.2', scorm12Handler)
			registry.set('2004', scorm2004Handler)

			const versions = resolveVersions(userOptions.target)
			for (const version of versions) {
				const handler = registry.get(version)
				if (!handler) continue
				const { manifest, suffix } = handler({ metadata, entry, distFiles: distributionFiles })
				const outputPath = await buildZip({ metadata, distFiles: distributionFiles, manifest, suffix, outputDir: outputDirectoryPath })
				this.info(`[vite-plugin-scorm] Created: ${outputPath}`)
			}
		},
	}
}
