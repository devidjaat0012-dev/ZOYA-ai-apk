import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'apk-mime-type',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url.endsWith('.apk') || req.url.includes('.apk'))) {
              res.setHeader('Content-Type', 'application/vnd.android.package-archive');
              res.setHeader('Content-Disposition', 'attachment; filename="Zoya-AI-Voice-Assistant.apk"');
              res.setHeader('Cache-Control', 'public, max-age=3600');
            }
            next();
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url.endsWith('.apk') || req.url.includes('.apk'))) {
              res.setHeader('Content-Type', 'application/vnd.android.package-archive');
              res.setHeader('Content-Disposition', 'attachment; filename="Zoya-AI-Voice-Assistant.apk"');
              res.setHeader('Cache-Control', 'public, max-age=3600');
            }
            next();
          });
        }
      },
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        useCredentials: true,
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        manifest: {
          id: '/',
          name: 'Zoya AI - Smart Voice Assistant',
          short_name: 'Zoya AI',
          description: 'A sassy, witty, and intelligent Indian female AI voice assistant & companion.',
          theme_color: '#0A0C10',
          background_color: '#0A0C10',
          display: 'standalone',
          display_override: ['standalone', 'window-controls-overlay'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['utilities', 'lifestyle', 'entertainment'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: "Voice Assistant (Hey Zoya)",
              short_name: "Voice Call",
              description: "Open hands-free voice assistant instead of Gemini",
              url: "/?action=voice&defaultAssistant=true",
              icons: [
                {
                  src: "pwa-192x192.png",
                  sizes: "192x192",
                  type: "image/png"
                }
              ]
            },
            {
              name: "Chat Assistant",
              short_name: "Chat Mode",
              description: "Instant AI chat with Zoya",
              url: "/?action=chat",
              icons: [
                {
                  src: "pwa-192x192.png",
                  sizes: "192x192",
                  type: "image/png"
                }
              ]
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'formdata-polyfill': path.resolve(__dirname, 'src/empty.ts'),
        'node-fetch': path.resolve(__dirname, 'src/empty.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
      ws: false,
    },
  };
});
