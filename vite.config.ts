import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' -> сборка работает и локально, и на GitHub Pages в подпапке
// (/<user>.github.io/SiteAboutUs/), и на собственном сервере в любом каталоге.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: true },
});
