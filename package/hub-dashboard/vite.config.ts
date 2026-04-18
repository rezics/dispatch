import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths({ ignoreConfigErrors: true }), react(), tailwindcss()],
  base: '/_dashboard/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
