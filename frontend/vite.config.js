import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['axios', 'canvg', '@babel/runtime']
  },
  build: {
    rollupOptions: {
      external: [
        'core-js',
        'canvg',
        '@babel/runtime'
      ]
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
