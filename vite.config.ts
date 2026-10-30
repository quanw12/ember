import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Base tương đối để chạy dưới sub-path GitHub Pages (/ember/)
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'data/free-exercises.json'],
      manifest: {
        name: 'EMBER — Keep the fire',
        short_name: 'EMBER',
        description: 'App luyện tập cá nhân: gym, chạy bộ, tiến trình. Local-first, offline.',
        lang: 'vi',
        theme_color: '#0A0A0C',
        background_color: '#0A0A0C',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // GIF minh họa (11MB) KHÔNG precache — lần đầu mở app phải tải 12MB
        // mới offline-ready là quá nặng trên 4G. Gif tải theo nhu cầu qua
        // runtime cache 'exercise-gifs' (CacheFirst) bên dưới.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,json}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/gifs\/[^/]+\.gif$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-gifs',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /^https:\/\/[ab]?\.?tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 }
            }
          }
        ]
      }
    })
  ]
})
