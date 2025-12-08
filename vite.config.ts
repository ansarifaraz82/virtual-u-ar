
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
        includeAssets: ['vite.svg', 'icon-192.png', 'icon-512.png'],
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
          icons: [
            {
              src: '/vite.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/icon-192.png',
              type: 'image/png',
              sizes: '192x192',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'any maskable'
            }
          ]
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
