import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/rhythm-app/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
