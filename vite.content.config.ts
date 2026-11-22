import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * The content script is injected on demand with chrome.scripting.executeScript,
 * so it must be a single self-contained IIFE (classic script, not an ES module).
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome110',
    minify: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/content/index.ts'),
      output: {
        format: 'iife',
        name: 'WebsiteContactExtractorContent',
        entryFileNames: 'content.js'
      }
    }
  }
});
