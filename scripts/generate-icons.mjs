// PWAアイコンの仮生成スクリプト。
// ダーク背景+絵文字の簡易デザイン。後で本物のロゴに差し替え可能。
// 実行前に一度だけ: npm install --save-dev sharp
// 実行: node scripts/generate-icons.mjs
// （sharpは生成専用なので、使い終わったら npm uninstall sharp でOK）
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const bg = '#0b0f17'
const accent = '#38bdf8'

function svgIcon({ size, safeZonePercent }) {
  // maskable用は安全圏(safeZonePercent)の中に収める。通常アイコンは100%いっぱい。
  const contentSize = size * safeZonePercent
  const fontSize = contentSize * 0.55
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${contentSize / 2}" fill="none" stroke="${accent}" stroke-width="${size * 0.02}"/>
  <text x="50%" y="50%" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central" font-family="'Segoe UI', system-ui, sans-serif">⚔️</text>
</svg>`
}

async function main() {
  const targets = [
    { name: 'icon-192.png', size: 192, safeZonePercent: 0.9 },
    { name: 'icon-512.png', size: 512, safeZonePercent: 0.9 },
    { name: 'maskable-512.png', size: 512, safeZonePercent: 0.6 }, // maskable: 中心80%安全圏に収める
    { name: 'apple-touch-icon.png', size: 180, safeZonePercent: 0.85 },
  ]

  for (const t of targets) {
    const svg = svgIcon({ size: t.size, safeZonePercent: t.safeZonePercent })
    await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, t.name))
    console.log('generated', t.name)
  }
}

main()
