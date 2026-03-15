import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DGSystem Supervisor',
        short_name: 'DG Supervisor',
        description: 'DGSystem Supervisor PWA',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%230f0f0f"/><text y="140" x="20" font-size="140">👷</text></svg>', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="%230f0f0f"/><text y="380" x="40" font-size="380">👷</text></svg>', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'CacheFirst' },
          { urlPattern: /\/api\/.*/, handler: 'NetworkFirst', options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 } }
        ]
      }
    })
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
})
