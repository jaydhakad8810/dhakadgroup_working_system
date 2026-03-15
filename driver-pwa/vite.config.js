import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DGSystem Driver',
        short_name: 'DG Driver',
        description: 'DGSystem Driver PWA',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%230a0a0f"/><text y="140" x="20" font-size="140">🚛</text></svg>', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="%230a0a0f"/><text y="380" x="40" font-size="380">🚛</text></svg>', sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
})
