import type { FormatContext, FormatResult } from '../types.js'
import {
	escapeXml,
	buildManifestIdentifiers,
	buildMetadataSection,
	buildFileElements,
	type ManifestIdentifiers,
} from './shared-xml.js'

const SCHEMA_VERSION = '2004 4th Edition'
const SCORM_TYPE_ATTRIBUTE = 'adlcp:scormType="sco"'

function buildManifestHeader(identifiers: ManifestIdentifiers): string {
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<manifest identifier="${identifiers.manifest}" version="1.0"`,
		'  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"',
		'  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"',
		'  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"',
		'  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"',
		'  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"',
		'  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
		'  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd',
		'  http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd',
		'  http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd',
		'  http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd',
		'  http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">',
	].join('\n')
}

function buildOrganizationSection(
	title: string,
	identifiers: ManifestIdentifiers,
): string {
	return [
		`  <organizations default="${identifiers.organization}">`,
		`    <organization identifier="${identifiers.organization}">`,
		`      <title>${title}</title>`,
		`      <item identifier="${identifiers.rootItem}" identifierref="${identifiers.resource}" isvisible="true">`,
		`        <title>${title}</title>`,
		'      </item>',
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

export function scorm2004Handler(context: FormatContext): FormatResult {
	const title = escapeXml(context.metadata.title)
	const description = escapeXml(context.metadata.description ?? '')
	const identifiers = buildManifestIdentifiers(context.metadata.id)

	const manifest = [
		buildManifestHeader(identifiers),
		buildMetadataSection(title, description, SCHEMA_VERSION),
		buildOrganizationSection(title, identifiers),
		buildResourceSection(identifiers, context.entry, context),
		'</manifest>',
	].join('\n')

	return { manifest, suffix: 'scorm2004' }
}
