import fs from 'node:fs/promises'
import path from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import type { CourseMetadata, DistributionFile } from './types.js'

export type ZipBuildOptions = {
	metadata: CourseMetadata
	distFiles: DistributionFile[]
	manifest: string
	suffix: string
	outputDir: string
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replaceAll(/[^\d a-z]+/g, '-')
		.replaceAll(/^-+|-+$/g, '')
}

async function buildZipInputs(
	distFiles: DistributionFile[],
	manifest: string,
): Promise<Record<string, Uint8Array>> {
	const inputs: Record<string, Uint8Array> = {
		'imsmanifest.xml': strToU8(manifest),
	}

	for (const file of distFiles) {
		const buffer = await fs.readFile(file.diskPath)
		inputs[file.relativePath] = new Uint8Array(buffer)
	}

	return inputs
}

export async function buildZip(options: ZipBuildOptions): Promise<string> {
	const { metadata, distFiles, manifest, suffix, outputDir } = options
	const inputs = await buildZipInputs(distFiles, manifest)
	const zipped = zipSync(inputs)

	await fs.mkdir(outputDir, { recursive: true })

	const baseName = slugify(metadata.id || metadata.title)
	const outputPath = path.join(outputDir, `${baseName}-${suffix}.zip`)
	await fs.writeFile(outputPath, zipped)

	return outputPath
}
