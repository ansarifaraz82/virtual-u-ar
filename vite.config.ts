
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'SelfLook AR',
          short_name: 'SelfLook',
          description: 'Virtual Try-On AI Application. Upload a photo and try on outfits instantly.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          categories: ['shopping', 'lifestyle', 'productivity'],
        }
      })
    ],
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    define: {
      // Polyfill process.env for browser compatibility
      // This allows 'process.env.API_KEY' to work in client-side code
      'process.env': JSON.stringify(env),
    },
  };
});
