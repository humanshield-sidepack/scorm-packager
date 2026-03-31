# svelte-enhanced-video

A Vite plugin that automatically generates multi-resolution, multi-format video variants from `<video:enhanced>` tags in Svelte components. Videos are encoded at build time (or lazily in dev) using FFmpeg, cached on disk, and served with responsive `<source>` tags.

## Install

```sh
pnpm add -D svelte-enhanced-video
```

FFmpeg is required. The plugin resolves it in this order:

1. `ffmpegPath` / `ffprobePath` options (explicit)
2. `ffmpeg-ffprobe-static` package
3. `ffmpeg-static` + `ffprobe-static` packages
4. System `PATH`

```sh
# Option A: install static binaries
pnpm add -D ffmpeg-ffprobe-static

# Option B: use system FFmpeg (must be on PATH)
ffmpeg -version
```

## Setup

Add the plugin to `vite.config.ts` **before** the Svelte plugin. The plugin works with both SvelteKit and plain Vite + Svelte setups.

### SvelteKit

```ts
import { enhancedVideo } from 'svelte-enhanced-video';
import { sveltekit } from '@sveltejs/kit/vite';

export default {
  plugins: [
    enhancedVideo({
      formats: ['mp4', 'webm'],
      resolutions: [1080, 720, 480],
      fps: 30,
    }),
    sveltekit(),
  ],
};
```

### Vite + Svelte (no SvelteKit)

The plugin does not depend on SvelteKit -- it hooks into Vite's `transform` and `load` lifecycle, so it works with the standalone `@sveltejs/vite-plugin-svelte` as well:

```ts
import { enhancedVideo } from 'svelte-enhanced-video';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [
    enhancedVideo({ formats: ['mp4'], fps: 30 }),
    svelte(),
  ],
});
```

### Options

| Option           | Type            | Default                              | Description                            |
| ---------------- | --------------- | ------------------------------------ | -------------------------------------- |
| `formats`        | `VideoFormat[]` | `['mp4', 'webm']`                    | Output formats: `mp4`, `webm`, `mp4_hevc` |
| `resolutions`    | `number[]`      | `[2160, 1440, 1080, 720, 480, 360]`  | Target heights in px                   |
| `fps`            | `number`        | source fps                           | FPS cap (`min(fps, source_fps)`)       |
| `cacheDirectory` | `string`        | `./.video-cache/videos`              | Disk cache location                    |
| `maxJobs`        | `number`        | `cpus - 1`                           | Concurrent FFmpeg processes            |
| `ffmpegPath`     | `string`        | auto-resolved                        | Custom FFmpeg binary                   |
| `ffprobePath`    | `string`        | auto-resolved                        | Custom ffprobe binary                  |
| `lockMaxAgeMs`   | `number`        | `7200000` (2h)                       | Stale lock cleanup threshold           |

## Usage

Use `<video:enhanced>` in any `.svelte` file:

```svelte
<video:enhanced
  src="./assets/hero.mp4"
  controls
  muted
  autoplay
  loop
  class="player"
/>
```

The plugin transforms this at compile time into a standard `<video>` with multiple `<source>` tags per format/resolution:

```html
<video id="video_0" controls muted autoplay loop class="player">
  <source src="/assets/hero_1080p.mp4" type="video/mp4" size="1080" />
  <source src="/assets/hero_720p.mp4" type="video/mp4" size="720" />
  <source src="/assets/hero_1080p.webm" type="video/webm; codecs=&quot;vp9&quot;" size="1080" />
  <source src="/assets/hero_720p.webm" type="video/webm; codecs=&quot;vp9&quot;" size="720" />
  Your browser does not support the video tag.
</video>
```

All standard `<video>` attributes (`controls`, `autoplay`, `muted`, `loop`, `preload`, `playsinline`, `class`, `style`, `id`, `data-*`, etc.) are passed through.

## Programmatic Import

You can also import video metadata directly:

```ts
import hero from './assets/hero.mp4?enhanced';
// hero.mp4["1080p"]  → "/assets/hero_1080p.mp4"
// hero.webm["720p"]  → "/_enhanced-video/hero_720p.webm"
```

Type shape:

```ts
interface EnhancedVideo {
  mp4: Record<string, string>;
  webm: Record<string, string>;
  mp4_hevc: Record<string, string>;
}
```

## Encoding Formats

| Format     | Codec       | Audio   | Container | Notes                   |
| ---------- | ----------- | ------- | --------- | ----------------------- |
| `mp4`      | H.264       | AAC     | MP4       | Universal, CRF 23       |
| `webm`     | VP9         | Opus    | WebM      | Smaller, CRF 32         |
| `mp4_hevc` | H.265       | AAC     | MP4       | Smallest, CRF 28, `hvc1` tag |

## Dev vs Build Behavior

**Development:** Videos encode in the background. The original file is served immediately as a fallback. When encoding finishes, a full HMR reload swaps in optimized sources. A polling interval (2s) checks for completion.

**Build:** All variants are encoded synchronously before the build completes. Missing FFmpeg or encoding errors will fail the build.

## Assumptions, Limitations & Gotchas

### `src` must be a static string

Only literal string paths work. These are **skipped** (with a console warning):

```svelte
<!-- Won't work -->
<video:enhanced src={videoPath} />
<video:enhanced src={`./assets/${name}.mp4`} />
```

### Resolution filtering

Only resolutions <= the source video height are generated. A 720p source with default config produces only 720p, 480p, and 360p variants. If the source is smaller than all configured resolutions, no `<source>` tags are generated.

### Cache management

- Cache lives at `.video-cache/videos/` by default -- add it to `.gitignore`
- Cache is **not auto-pruned**; it grows over time as videos change
- Cache key = `SHA256(mtime + filesize + fps_cap)` -- changing the `fps` option invalidates the entire cache
- Delete `.video-cache/` to force re-encode

### First dev server start can be slow

Large videos or many resolutions cause noticeable encoding delay on first run. Consider pre-building your cache or reducing resolutions/formats during development.

### FFmpeg codec parameters are hardcoded

CRF values, presets, and codec flags cannot be customized per-format or per-resolution.

### Only works in `.svelte` files

The `<video:enhanced>` transform runs on Svelte file AST. It does not work in plain HTML, dynamic string templates, or programmatically constructed markup.

### Browser support considerations

- `webm` (VP9) -- not supported in Safari < 16.4
- `mp4_hevc` (H.265) -- limited support outside Safari/iOS; requires `hvc1` tag
- `mp4` (H.264) -- universal support

### Plugin order matters

`enhancedVideo()` must be registered **before** `sveltekit()` in the Vite plugins array so the transform runs first.
