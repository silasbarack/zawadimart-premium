import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the backend in server/ during development.
    proxy: { '/api': process.env.VITE_API_PROXY || 'http://localhost:4000' },
  },
});
