import { defineConfig, devices } from '@playwright/test'

// WebKit（＝iPhoneのSafariの中身）でアプリが壊れていないかを、実機なしで確かめるための設定。
// DESIGN.md §12-3。iOS Safariそのものではないが、「WebKitでだけ落ちる／表示が崩れる」類は拾える。
// ブラウザ開発者ツールの「iPhone表示」はエンジンがChromeのままなので、こちらを使う。
//
// 使い方: npm run test:webkit
// 初回だけ WebKit の本体を落とす必要がある: npx playwright install webkit
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    trace: 'retain-on-failure',
  },
  // iPhone 13 のプリセット＝WebKit＋スマホの画面サイズ＋タッチ操作。
  projects: [{ name: 'webkit-iphone', use: { ...devices['iPhone 13'] } }],
  // テストの前に開発サーバーを自動で起動し、終わったら止める。
  webServer: {
    command: 'npm run dev -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
