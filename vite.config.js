import { defineConfig } from 'vite';

// base: './' gjør at bygget fungerer på GitHub Pages uansett reponavn.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
