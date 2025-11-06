import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // Use base path only in production (GitHub Pages), not in development
  base: process.env.NODE_ENV === 'production' ? '/rhythm-app/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
