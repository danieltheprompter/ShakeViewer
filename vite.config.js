import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    assetsDir: 'assets',
    sourcemap: false,
  },
  test: {
    environment: 'node',
  },
  server: {
    host: true,
    port: 5173,
  },
});
