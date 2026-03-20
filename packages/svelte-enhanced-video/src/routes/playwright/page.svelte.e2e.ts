import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/playwright');
});

test('every <source> element has a src attribute (no src-less sources)', async ({ page }) => {
	const sources = page.locator('video source');
	const count = await sources.count();
	expect(count).toBeGreaterThan(0);
	for (let index = 0; index < count; index++) {
		const sourceSrc = await sources.nth(index).getAttribute('src');
		expect(sourceSrc).toBeTruthy();
	}
});

test('no source src attribute starts with file:// (SSR URL not leaked)', async ({ page }) => {
	const sources = page.locator('video source');
	const count = await sources.count();
	for (let index = 0; index < count; index++) {
		const sourceSrc = await sources.nth(index).getAttribute('src');
		expect(sourceSrc).not.toMatch(/^file:\/\//);
	}
});

test('no <video> element has a src attribute (src belongs on <source> children)', async ({
	page
}) => {
	const videos = page.locator('video');
	const count = await videos.count();
	expect(count).toBeGreaterThan(0);
	for (let index = 0; index < count; index++) {
		const videoSrc = await videos.nth(index).getAttribute('src');
		expect(videoSrc).toBeNull();
	}
});

test('every <source> has a type attribute', async ({ page }) => {
	const sources = page.locator('video source');
	const count = await sources.count();
	for (let index = 0; index < count; index++) {
		const sourceType = await sources.nth(index).getAttribute('type');
		expect(sourceType).toBeTruthy();
	}
});

test('controls attribute is present only on vid-controls', async ({ page }) => {
	const withControls = page.locator('#vid-controls');
	await expect(withControls).toHaveAttribute('controls');

	const withoutControls = page.locator('#vid-booleans');
	await expect(withoutControls).not.toHaveAttribute('controls');

	const dataVideo = page.locator('#vid-data');
	await expect(dataVideo).not.toHaveAttribute('controls');
});

test('class attribute is passed through to vid-controls', async ({ page }) => {
	await expect(page.locator('#vid-controls')).toHaveClass(/test-class/);
});

test('boolean attributes muted, autoplay, loop are passed through to vid-booleans', async ({
	page
}) => {
	const video = page.locator('#vid-booleans');
	await expect(video).toHaveAttribute('muted');
	await expect(video).toHaveAttribute('autoplay');
	await expect(video).toHaveAttribute('loop');
});

test('data-testid and style are passed through to vid-data', async ({ page }) => {
	const video = page.locator('#vid-data');
	await expect(video).toHaveAttribute('data-testid', 'my-video');
	await expect(video).toHaveAttribute('style', /width:\s*100%/);
});

test('fallback id is generated for the video without an explicit id', async ({ page }) => {
	const videoIds = await page
		.locator('video')
		.evaluateAll((elements: Element[]) => elements.map((element) => element.getAttribute('id')));
	const generatedIds = videoIds.filter((id) => id?.startsWith('video_'));
	expect(generatedIds.length).toBeGreaterThan(0);
});

test('explicit id is preserved verbatim and not duplicated', async ({ page }) => {
	const video = page.locator('#vid-controls');
	await expect(video).toHaveAttribute('id', 'vid-controls');

	const matchingIds = await page.locator('[id="vid-controls"]').count();
	expect(matchingIds).toBe(1);
});
