import { describe, it, expect, vi } from 'vitest';
import { transformSvelteCode } from './transform';
import type { TransformOptions } from './transform';

const RESOLUTION_HIGH = 1080;
const RESOLUTION_LOW = 720;
const OPTIONS: TransformOptions = {
	resolutions: [RESOLUTION_HIGH, RESOLUTION_LOW],
	formats: ['mp4', 'webm']
};

/** Wrap markup in a minimal Svelte component with an existing script block. */
function withScript(markup: string): string {
	return `<script>\nlet x = 1;\n</script>\n${markup}`;
}

/** Transform markup (wrapped in a script block) and return the output code string. */
function transform(markup: string, options = OPTIONS): string {
	const result = transformSvelteCode(withScript(markup), options);
	expect(result).toBeDefined();
	return result!.code;
}

describe('transformSvelteCode - basic', () => {
	it('returns undefined when no video:enhanced tags exist', () => {
		expect(transformSvelteCode('<div>hello</div>', OPTIONS)).toBeUndefined();
	});

	it('returns undefined when the only tag has a dynamic src', () => {
		expect(transformSvelteCode(`<video:enhanced src={myVar} />`, OPTIONS)).toBeUndefined();
	});

	it('returns undefined when tag has no src attribute', () => {
		expect(transformSvelteCode(`<video:enhanced controls />`, OPTIONS)).toBeUndefined();
	});
});

describe('transformSvelteCode - src parsing', () => {
	it('handles a static double-quoted src', () => {
		expect(transform(`<video:enhanced src="./foo.mp4" />`)).toContain('./foo.mp4?enhanced');
	});

	it('handles a static single-quoted src', () => {
		expect(transform(`<video:enhanced src='./bar.mp4' />`)).toContain('./bar.mp4?enhanced');
	});

	it('treats a string-literal in curly braces as static', () => {
		expect(transform(`<video:enhanced src={"./foo.mp4"} />`)).toContain('./foo.mp4?enhanced');
	});

	it('treats single-quoted curly-brace src as static', () => {
		expect(transform(`<video:enhanced src={'./bar.mp4'} />`)).toContain('./bar.mp4?enhanced');
	});

	it('ignores tags with a bare variable reference (dynamic) src', () => {
		const code = transform(`<video:enhanced src="./a.mp4" /><video:enhanced src={myVar} />`);
		expect(code).toContain('./a.mp4?enhanced');
		expect(code).not.toContain('myVar?enhanced');
	});

	it('appends &enhanced when the src already has a query string', () => {
		expect(transform(`<video:enhanced src="./foo.mp4?v=1" />`)).toContain('./foo.mp4?v=1&enhanced');
	});
});

describe('transformSvelteCode - import injection', () => {
	it('generates a named import for the enhanced asset', () => {
		expect(transform(`<video:enhanced src="./hero.mp4" />`)).toContain(
			`import __ENHANCED_VIDEO_0__ from "./hero.mp4?enhanced";`
		);
	});

	it('injects the import at the top of an existing <script> block', () => {
		const code = transform(`<video:enhanced src="./hero.mp4" />`);
		expect(code).toContain('<script>import __ENHANCED_VIDEO_0__');
		expect(code).toContain('let x = 1;');
	});

	it('creates a new <script> block when none exists', () => {
		const result = transformSvelteCode(`<video:enhanced src="./hero.mp4" />`, OPTIONS)!;
		expect(result.code.startsWith('<script>')).toBe(true);
		expect(result.code).toContain(`import __ENHANCED_VIDEO_0__ from "./hero.mp4?enhanced";`);
	});

	it('injects into a <script lang="ts"> block', () => {
		const svelteCode = `<script lang="ts">\nlet x = 1;\n</script>\n<video:enhanced src="./hero.mp4" />`;
		const result = transformSvelteCode(svelteCode, OPTIONS)!;
		expect(result.code).toContain(`<script lang="ts">import __ENHANCED_VIDEO_0__`);
	});
});

describe('transformSvelteCode - source elements', () => {
	it('produces one <source> per format × resolution', () => {
		const code = transform(`<video:enhanced src="./foo.mp4" />`);
		const sourceCount = (code.match(/<source/g) ?? []).length;
		expect(sourceCount).toBe(OPTIONS.formats.length * OPTIONS.resolutions.length);
	});

	it('wraps every <source> in an {#if} guard', () => {
		const code = transform(`<video:enhanced src="./foo.mp4" />`);
		const ifCount = (code.match(/\{#if /g) ?? []).length;
		const endIfCount = (code.match(/\{\/if\}/g) ?? []).length;
		const sourceCount = (code.match(/<source/g) ?? []).length;
		expect(ifCount).toBe(sourceCount);
		expect(endIfCount).toBe(sourceCount);
	});

	it('{#if} guard references the correct import name and resolution key', () => {
		const code = transform(`<video:enhanced src="./foo.mp4" />`);
		expect(code).toContain(`{#if __ENHANCED_VIDEO_0__.mp4?.["${RESOLUTION_HIGH}p"]}`);
		expect(code).toContain(`{#if __ENHANCED_VIDEO_0__.webm?.["${RESOLUTION_LOW}p"]}`);
	});
});

describe('transformSvelteCode - id handling', () => {
	it('falls back to video_N id when none is specified', () => {
		expect(transform(`<video:enhanced src="./a.mp4" />`)).toContain('id="video_0"');
	});

	it('passes through an explicit id without duplicating it', () => {
		const code = transform(`<video:enhanced id="hero-video" src="./a.mp4" />`);
		expect(code).toContain('id="hero-video"');
		expect((code.match(/\bid=/g) ?? []).length).toBe(1);
	});
});

describe('transformSvelteCode - attribute passthrough', () => {
	it('passes through class and style attributes', () => {
		const code = transform(`<video:enhanced src="./foo.mp4" class="hero" style="width:100%" />`);
		expect(code).toContain('class="hero"');
		expect(code).toContain('style="width:100%"');
	});

	it('passes through boolean attributes (muted, autoplay, loop)', () => {
		const code = transform(`<video:enhanced src="./foo.mp4" muted autoplay loop />`);
		expect(code).toContain('muted');
		expect(code).toContain('autoplay');
		expect(code).toContain('loop');
	});

	it('does not put src= on the <video> element', () => {
		const code = transform(`<video:enhanced src="./foo.mp4" />`);
		const videoStart = code.indexOf('<video ');
		const videoTagEnd = code.indexOf('>', videoStart) + 1;
		const videoOpenTag = code.slice(videoStart, videoTagEnd);
		expect(videoOpenTag).not.toContain('src=');
	});

	it('does not include controls unless explicitly written', () => {
		expect(transform(`<video:enhanced src="./foo.mp4" />`)).not.toContain('controls');
	});

	it('includes controls when explicitly written', () => {
		expect(transform(`<video:enhanced src="./foo.mp4" controls />`)).toContain('controls');
	});
});

describe('transformSvelteCode - multiple tags', () => {
	it('transforms multiple video tags independently', () => {
		const code = transform(`<video:enhanced src="./a.mp4" /><video:enhanced src="./b.mp4" />`);
		expect(code).toContain('__ENHANCED_VIDEO_0__');
		expect(code).toContain('__ENHANCED_VIDEO_1__');
		expect(code).toContain('./a.mp4?enhanced');
		expect(code).toContain('./b.mp4?enhanced');
	});

	it('assigns sequential fallback ids to multiple tags', () => {
		const code = transform(`<video:enhanced src="./a.mp4" /><video:enhanced src="./b.mp4" />`);
		expect(code).toContain('id="video_0"');
		expect(code).toContain('id="video_1"');
	});

	it('de-duplicates imports for repeated identical src', () => {
		const code = transform(`<video:enhanced src="./a.mp4" /><video:enhanced src="./a.mp4" />`);
		const importCount = (code.match(/import __ENHANCED_VIDEO/g) ?? []).length;
		expect(importCount).toBe(1);
	});
});

describe('transformSvelteCode - output', () => {
	it('removes the video:enhanced tag from output', () => {
		expect(transform(`<video:enhanced src="./hero.mp4" />`)).not.toContain('<video:enhanced');
	});

	it('returns a source map', () => {
		const result = transformSvelteCode(withScript(`<video:enhanced src="./hero.mp4" />`), OPTIONS)!;
		expect(result.map).toBeTruthy();
	});
});

describe('transformSvelteCode - multi-chunk src', () => {
	it('returns undefined for interpolated src like src="prefix{var}.mp4"', () => {
		expect(
			transformSvelteCode(`<video:enhanced src="prefix{someVar}.mp4" />`, OPTIONS)
		).toBeUndefined();
	});

	it('does not use the partial prefix as an import path', () => {
		const result = transformSvelteCode(
			`<video:enhanced src="./static.mp4" /><video:enhanced src="prefix{someVar}.mp4" />`,
			OPTIONS
		);
		expect(result).toBeDefined();
		expect(result!.code).not.toContain('prefix?enhanced');
		expect(result!.code).not.toContain('prefix&enhanced');
	});
});

describe('transformSvelteCode - warnings', () => {
	it('emits a warn for a dynamic src expression', () => {
		const warn = vi.fn();
		transformSvelteCode(`<video:enhanced src={myVar} />`, OPTIONS, warn);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('dynamic'));
	});

	it('emits a warn for a multi-chunk interpolated src', () => {
		const warn = vi.fn();
		transformSvelteCode(`<video:enhanced src="prefix{someVar}.mp4" />`, OPTIONS, warn);
		expect(warn).toHaveBeenCalledOnce();
	});

	it('emits a warn when formats array is empty', () => {
		const warn = vi.fn();
		transformSvelteCode(`<video:enhanced src="./foo.mp4" />`, { ...OPTIONS, formats: [] }, warn);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('formats'));
	});

	it('emits a warn when resolutions array is empty', () => {
		const warn = vi.fn();
		transformSvelteCode(
			`<video:enhanced src="./foo.mp4" />`,
			{ ...OPTIONS, resolutions: [] },
			warn
		);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('resolutions'));
	});
});
