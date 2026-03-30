import type { FormatContext, FormatResult } from '../types.js'
import {
	escapeXml,
	buildManifestIdentifiers,
	buildMetadataSection,
	buildFileElements,
	type ManifestIdentifiers,
} from './shared-xml.js'

const SCHEMA_VERSION = '1.2'
const SCORM_TYPE_ATTRIBUTE = 'adlcp:scormtype="sco"'

function buildManifestHeader(identifiers: ManifestIdentifiers): string {
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<manifest identifier="${identifiers.manifest}" version="1.0"`,
		'  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"',
		'  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"',
		'  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
		'  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 ims_xml.xsd',
		'  http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd',
		'  http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">',
	].join('\n')
}

function buildMasteryScoreNode(masteryScore: number | undefined): string {
	if (typeof masteryScore !== 'number') return ''
	return `        <adlcp:masteryscore>${Math.round(masteryScore)}</adlcp:masteryscore>`
}

function buildOrganizationSection(
	title: string,
	identifiers: ManifestIdentifiers,
	masteryScore: number | undefined,
): string {
	const masteryNode = buildMasteryScoreNode(masteryScore)
	const itemLines = [
		`      <item identifier="${identifiers.rootItem}" identifierref="${identifiers.resource}" isvisible="true">`,
		`        <title>${title}</title>`,
		...(masteryNode ? [masteryNode] : []),
		'      </item>',
	]
	return [
		`  <organizations default="${identifiers.organization}">`,
		`    <organization identifier="${identifiers.organization}">`,
		`      <title>${title}</title>`,
		...itemLines,
		'    </organization>',
		'  </organizations>',
	].join('\n')
}

function buildResourceSection(
	identifiers: ManifestIdentifiers,
	entry: string,
	context: FormatContext,
): string {
	return [
		'  <resources>',
		`    <resource identifier="${identifiers.resource}" type="webcontent" ${SCORM_TYPE_ATTRIBUTE} href="${escapeXml(entry)}">`,
		buildFileElements(context.distFiles),
		'    </resource>',
		'  </resources>',
	].join('\n')
}

export function scorm12Handler(context: FormatContext): FormatResult {
	const title = escapeXml(context.metadata.title)
	const description = escapeXml(context.metadata.description ?? '')
	const identifiers = buildManifestIdentifiers(context.metadata.id)

	const manifest = [
		buildManifestHeader(identifiers),
		buildMetadataSection(title, description, SCHEMA_VERSION),
		buildOrganizationSection(title, identifiers, context.metadata.masteryScore),
		buildResourceSection(identifiers, context.entry, context),
		'</manifest>',
	].join('\n')

	return { manifest, suffix: 'scorm12' }
}
