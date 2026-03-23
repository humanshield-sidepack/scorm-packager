import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('src/_lib', import.meta.url)),
      $course: fileURLToPath(new URL('src/course', import.meta.url)),
    },
  },
})
