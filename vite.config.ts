import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 等のサブパス配布に備えて base を環境変数で切替可能にしておく。
// ローカル開発では '/' のまま。
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  server: {
    // 常に同じポート・同じWi-Fi公開設定にして、毎回ポート番号を打ち込まなくて済むようにする。
    host: true,
    port: 5200,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'TCG Companion',
        short_name: 'TCG',
        description: 'アナログTCG対戦の汎用支援ツール',
        theme_color: '#0b0f17',
        background_color: '#0b0f17',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
