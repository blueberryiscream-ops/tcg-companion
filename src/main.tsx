import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ensureSeed } from './db/db'

// 起動時に内蔵ゲームプロファイルを用意してからアプリを描画する。
ensureSeed().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
