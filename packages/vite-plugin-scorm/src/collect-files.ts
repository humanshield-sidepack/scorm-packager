import fs from 'node:fs/promises'
import path from 'node:path'
import type { DistributionFile } from './types.js'

async function collectFromDirectory(
	directoryPath: string,
	prefix: string,
): Promise<DistributionFile[]> {
	const entries = await fs.readdir(directoryPath, { withFileTypes: true })
	const files: DistributionFile[] = []

	for (const entry of entries) {
		const diskPath = path.join(directoryPath, entry.name)
		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

		if (entry.isDirectory()) {
			const nested = await collectFromDirectory(diskPath, relativePath)
			files.push(...nested)
		} else {
			files.push({ diskPath, relativePath })
		}
	}

	return files
}

export async function collectDistributionFiles(
	directoryPath: string,
): Promise<DistributionFile[]> {
	return collectFromDirectory(directoryPath, '')
}
