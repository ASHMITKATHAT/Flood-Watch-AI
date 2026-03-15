import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://172.19.75.116:5000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://172.19.75.116:5000',
        ws: true,
      },
    },
  },
})