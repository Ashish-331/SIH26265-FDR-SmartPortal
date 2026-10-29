import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/v1/fdr': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/api/v1/cbs': {
        target: 'http://localhost:8001',
        changeOrigin: true
      },
      '/api/v1/ocr': {
        target: 'http://localhost:8002',
        changeOrigin: true
      },
      '/api/v1/audit': {
        target: 'http://localhost:8003',
        changeOrigin: true
      }
    }
  }
});
