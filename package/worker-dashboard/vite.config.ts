import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/status': 'http://localhost:45321',
      '/tasks': 'http://localhost:45321',
      '/config': 'http://localhost:45321',
    },
  },
})
