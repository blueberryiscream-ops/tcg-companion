import { useEffect, useRef } from 'react'

// この端末/ブラウザが Screen Wake Lock API に対応しているか（設定画面の注意書き用）。
export const WAKE_LOCK_SUPPORTED =
  typeof navigator !== 'undefined' && 'wakeLock' in navigator

// enabled が true の間、画面が自動で消えないようにする（DESIGN.md §8-2）。
// タブが裏に回ると解放され、表に戻ってenabledのままなら再取得する。
export function useWakeLock(enabled: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || !WAKE_LOCK_SUPPORTED) return

    let cancelled = false

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await lock.release()
          return
        }
        lockRef.current = lock
      } catch {
        // 端末の省電力設定などで拒否されることがあるが、致命的ではないので無視する。
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        acquire()
      }
    }

    acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      lockRef.current?.release().catch(() => {})
      lockRef.current = null
    }
  }, [enabled])
}
