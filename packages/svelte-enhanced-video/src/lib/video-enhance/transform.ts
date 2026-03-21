import { parse } from 'svelte-parse-markup';
import { walk } from 'zimmerframe';
import MagicString from 'magic-string';
import type { AST } from 'svelte/compiler';
import { FORMAT_MIME_TYPES } from './encoder.js';
import type { VideoFormat } from './encoder.js';

export interface TransformOptions {
	resolutions: number[];
	formats: VideoFormat[];
}

function getAttributeValue(
	node: AST.RegularElement,
	attributeName: string
): AST.Text | AST.ExpressionTag | undefined {
	const attribute = node.attributes.find(
		(a): a is AST.Attribute => a.type === 'Attribute' && 'name' in a && a.name === attributeName
	);
	if (!attribute || attribute.value === true) return undefined;
	const { value } = attribute;
	if (Array.isArray(value)) {
		if (value.length !== 1) return undefined;
		return value[0];
	}
	return value;
}

function getStaticSource(sourceAttribute: AST.Text | AST.ExpressionTag): string | undefined {
	if (sourceAttribute.type === 'Text') return sourceAttribute.raw.trim();
	const expr = sourceAttribute.expression;
	if (expr.type === 'Literal' && typeof expr.value === 'string') {
		return expr.value;
	}
	return undefined;
}

function buildSourceTags(
	importName: string,
	formats: VideoFormat[],
	resolutions: number[]
): string {
	let sources = '';
	for (const format of formats) {
		for (const resolution of resolutions) {
			const source = `${importName}.${format}?.["${resolution}p"]`;
			const mimeType = FORMAT_MIME_TYPES.get(format) ?? 'video/mp4';
			sources += `\n\t\t{#if ${source}}<source src={${source}} type="${mimeType}" size="${resolution}" />{/if}`;
		}
	}
	return sources;
}

function serializePassthroughAttributes(
	code: string,
	node: AST.RegularElement,
	fallbackId: string
): string {
	const hasExplicitId = node.attributes.some(
		(a): a is AST.Attribute => a.type === 'Attribute' && 'name' in a && a.name === 'id'
	);
	const parts: string[] = [];
	if (!hasExplicitId) {
		parts.push(`id="${fallbackId}"`);
	}
	for (const attribute of node.attributes) {
		if (!('name' in attribute) || (attribute as AST.Attribute).name === 'src') continue;
		parts.push(code.slice(attribute.start, attribute.end).trim());
	}
	return parts.join(' ');
}

interface VideoElementContext {
	code: string;
	node: AST.RegularElement;
	imports: Map<string, string>;
	warn: (message: string) => void;
}

function resolveVideoElementReplacement(
	context: VideoElementContext,
	currentIndex: number,
	options: TransformOptions
): string | undefined {
	const { code, node, imports, warn } = context;
	const sourceAttributeNode = getAttributeValue(node, 'src');
	if (!sourceAttributeNode) {
		warn(
			`[svelte-enhanced-video] <video:enhanced> at position ${node.start} has a dynamic or missing src — ` +
				`only static string paths are supported. The element will not be enhanced.`
		);
		return undefined;
	}

	const staticSource = getStaticSource(sourceAttributeNode);
	if (!staticSource) {
		warn(
			`[svelte-enhanced-video] <video:enhanced> at position ${node.start} has a dynamic src expression — ` +
				`only static string literals are supported. The element will not be enhanced.`
		);
		return undefined;
	}

	const importPath = staticSource.includes('?')
		? `${staticSource}&enhanced`
		: `${staticSource}?enhanced`;
	const importName = imports.get(importPath) ?? `__ENHANCED_VIDEO_${currentIndex}__`;
	imports.set(importPath, importName);

	const passthroughAttributes = serializePassthroughAttributes(code, node, `video_${currentIndex}`);
	const sources = buildSourceTags(importName, options.formats, options.resolutions);
	return `<video ${passthroughAttributes}>${sources}\n\t\tYour browser does not support the video tag.</video>`;
}

function injectImportStatements(s: MagicString, ast: AST.Root, importText: string): void {
	if (ast.instance) {
		const contentStart = (ast.instance.content as unknown as { start: number }).start;
		s.appendLeft(contentStart, importText);
	} else {
		s.prepend(`<script>\n${importText}</script>\n`);
	}
}

export function transformSvelteCode(
	code: string,
	options: TransformOptions,
	warn: (message: string) => void = () => {}
): { code: string; map: string } | undefined {
	if (!code.includes('<video:enhanced')) return undefined;

	if (options.formats.length === 0 || options.resolutions.length === 0) {
		warn(
			`[svelte-enhanced-video] transformSvelteCode called with empty ` +
				`${options.formats.length === 0 ? 'formats' : 'resolutions'} array — ` +
				`no <source> elements will be generated.`
		);
	}

	const ast = parse(code, { modern: true }) as AST.Root;
	const s = new MagicString(code);
	const imports = new Map<string, string>();
	let tagIndex = 0;

	walk(
		ast as unknown as AST.TemplateNode,
		{},
		{
			RegularElement(node, { next }) {
				if (!('name' in node) || node.name !== 'video:enhanced') {
					next();
					return;
				}
				const replacement = resolveVideoElementReplacement(
					{ code, node, imports, warn },
					tagIndex++,
					options
				);
				if (replacement) s.update(node.start, node.end, replacement);
			}
		}
	);

	if (imports.size === 0) return undefined;

	let importText = '';
	for (const [importPath, importName] of imports.entries()) {
		importText += `import ${importName} from "${importPath}";\n`;
	}
	injectImportStatements(s, ast, importText);

	return { code: s.toString(), map: s.generateMap({ hires: 'boundary' }).toString() };
}
