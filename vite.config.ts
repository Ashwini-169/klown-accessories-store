import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
  host: '0.0.0.0',  // Listen on all network interfaces
  port: 5173,       // Default Vite port
  // Allow the Render hostname (and localhost) to access the dev server.
  // If you prefer to allow any host while testing, use: allowedHosts: 'all'
  allowedHosts: ['klown-accessories-store.onrender.com', 'localhost'],
  },
});
