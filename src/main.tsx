import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ensureSeed } from './db/db'
import { requestPersistentStorage } from './lib/platform'

// ブラウザに「このアプリのデータを勝手に消さないでほしい」と要求する（DESIGN.md §12-2）。
// 対応していなければ何も起きない。結果は待たない（描画を遅らせない）。
void requestPersistentStorage()

// 起動時に内蔵ゲームプロファイルを用意してからアプリを描画する。
ensureSeed().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
