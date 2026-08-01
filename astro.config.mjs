// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // `@` maps to `src` so imports read the same everywhere, no ../../ chains.
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // Pre-bundle Mermaid at server start so its first dynamic import in the
    // editor doesn't trigger an on-demand re-optimization (504) mid-session.
    optimizeDeps: {
      include: ['mermaid', 'docx'],
    },
  },
});
