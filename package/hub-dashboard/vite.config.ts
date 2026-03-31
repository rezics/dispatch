import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/_dashboard/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/tasks': 'http://localhost:3721',
      '/workers': 'http://localhost:3721',
      '/projects': 'http://localhost:3721',
    },
  },
})
