export type ManifestIdentifiers = {
	manifest: string
	organization: string
	rootItem: string
	resource: string
}

export function escapeXml(value: string): string {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}

export function buildManifestIdentifiers(courseId: string): ManifestIdentifiers {
	const safe = escapeXml(courseId)
	return {
		manifest: `MANIFEST-${safe}`,
		organization: `ORG-${safe}`,
		rootItem: `ITEM-${safe}`,
		resource: `RES-${safe}`,
	}
}

export function buildMetadataSection(
	title: string,
	description: string,
	schemaVersion: string,
): string {
	return [
		'  <metadata>',
		'    <schema>ADL SCORM</schema>',
		`    <schemaversion>${schemaVersion}</schemaversion>`,
		'    <lom xmlns="http://ltsc.ieee.org/xsd/LOM">',
		'      <general>',
		`        <title><string language="en">${title}</string></title>`,
		`        <description><string language="en">${description}</string></description>`,
		'      </general>',
		'    </lom>',
		'  </metadata>',
	].join('\n')
}

export function buildFileElements(files: { relativePath: string }[]): string {
	return files
		.map((file) => `      <file href="${escapeXml(file.relativePath)}" />`)
		.join('\n')
}
