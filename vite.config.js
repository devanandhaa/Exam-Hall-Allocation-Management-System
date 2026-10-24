import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api calls are forwarded to the small Express layer (server/index.js)
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:5000' } },
});
