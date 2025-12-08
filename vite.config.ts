
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
          id: '/',
          display: 'standalone',
          orientation: 'portrait',
          categories: ['shopping', 'lifestyle', 'productivity'],
          icons: [
            {
              src: '/images/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          screenshots: [
            {
              src: '/images/screenshots/screenshots-1.png',
              type: 'image/png',
              sizes: '1080x1920' // Example size, adjust if needed
            }
          ]
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/esm\.sh\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'esm-sh-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https?:\/\/cdn\.tailwindcss\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'tailwind-cdn-cache',
                expiration: {
                  maxEntries: 1,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // A week
                }
              }
            },
            {
              urlPattern: /^https?:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
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
