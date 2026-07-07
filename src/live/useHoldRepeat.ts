import { useCallback, useEffect, useRef } from 'react'
import type React from 'react'

// タップ＝1回だけ、長押し＝一定間隔で連続実行、を実現する部品。
// ライフの「大きい±ボタン（タップで±1・長押しで速い増減）」に使う。
export function useHoldRepeat(opts: {
  onTap: () => void
  onHoldStep: () => void
  holdDelay?: number
  repeatEvery?: number
}) {
  const { onTap, onHoldStep, holdDelay = 350, repeatEvery = 200 } = opts

  // 最新の関数を参照で持つ（再レンダーで古い関数を掴まないため）。
  const tapRef = useRef(onTap)
  const stepRef = useRef(onHoldStep)
  tapRef.current = onTap
  stepRef.current = onHoldStep

  const held = useRef(false)
  const startTimer = useRef<number | null>(null)
  const repeatTimer = useRef<number | null>(null)

  const clear = useCallback(() => {
    if (startTimer.current !== null) {
      clearTimeout(startTimer.current)
      startTimer.current = null
    }
    if (repeatTimer.current !== null) {
      clearInterval(repeatTimer.current)
      repeatTimer.current = null
    }
  }, [])

  // 画面から消えるときにタイマーを止める（安全策）。
  useEffect(() => clear, [clear])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      held.current = false
      startTimer.current = window.setTimeout(() => {
        held.current = true
        stepRef.current()
        repeatTimer.current = window.setInterval(() => stepRef.current(), repeatEvery)
      }, holdDelay)
    },
    [holdDelay, repeatEvery],
  )

  const finish = useCallback(() => {
    clear()
    if (!held.current) tapRef.current()
    held.current = false
  }, [clear])

  const cancel = useCallback(() => {
    clear()
    held.current = false
  }, [clear])

  return {
    onPointerDown,
    onPointerUp: finish,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  }
}
