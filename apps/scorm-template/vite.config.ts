import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { scormPackager } from "vite-plugin-scorm";
import tailwindcss from "@tailwindcss/vite";
import { mdsvex } from "mdsvex";
import { enhancedVideo } from "svelte-enhanced-video";

export default defineConfig({
  base: "./",
  plugins: [
    enhancedVideo({ formats: ["mp4"], fps: 30 }),
    svelte({
      extensions: [".svelte", ".svx"],
      preprocess: mdsvex({ extensions: [".svx"] }),
    }),
    scormPackager({ target: "both" }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      $core: fileURLToPath(new URL("src/_core", import.meta.url)),
      $course: fileURLToPath(new URL("src/course", import.meta.url)),
      $lib: fileURLToPath(new URL("src/lib", import.meta.url)),
    },
  },
});
