import { useEffect, useState } from 'react'

// この端末/ブラウザがFullscreen APIに対応しているか（設定画面の注意書き用）。
export const FULLSCREEN_SUPPORTED =
  typeof document !== 'undefined' && document.fullscreenEnabled === true

// 対戦中、ブラウザのアドレスバー等を隠す全画面表示を管理する。
// 相手側のボタンが画面上端（＝ブラウザのバーの近く）にあり、誤タップの原因になりやすいための対策。
// ブラウザの仕様上、ユーザーの実際のタップ操作の中からしか全画面化を開始できない。
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  async function enter() {
    if (!FULLSCREEN_SUPPORTED || document.fullscreenElement) return
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // 端末側で拒否されることがあるが、致命的ではないので無視する。
    }
  }

  async function exit() {
    if (!document.fullscreenElement) return
    try {
      await document.exitFullscreen()
    } catch {
      // 無視する
    }
  }

  return { isFullscreen, enter, exit }
}
