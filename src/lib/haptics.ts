// 対応端末（主にAndroid Chrome）だけで軽く振動させる。iOS Safari等は未対応でも何も起きないだけで安全。
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
