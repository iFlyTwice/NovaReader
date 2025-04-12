import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'

import manifest from './src/manifest'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    build: {
      emptyOutDir: true,
      outDir: 'build',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/chunk-[hash].js',
        },
        watch: {
          include: ['src/**', 'css/**'],
          buildDelay: 100,
          clearScreen: false
        }
      },
    },
    plugins: [
      crx({ 
        manifest,
        watchOptions: {
          polling: 1000
        }
      }), 
      react()
    ],
    server: {
      watch: {
        usePolling: true,
        interval: 1000
      }
    },
    legacy: {
      skipWebSocketTokenCheck: true,
    },
  }
})
