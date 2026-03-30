import { mdsvex } from "mdsvex";

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  extensions: [".svelte", ".svx"],
  preprocess: mdsvex({ extensions: [".svx"] }),
};
