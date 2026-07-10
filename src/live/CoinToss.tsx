import { useState } from 'react'
import { vibrate } from '../lib/haptics'

type Face = '表' | '裏'

const TOSS_DURATION = 700

// コインの見た目（1枚だけ）。金色のグラデーションで丸いディスク1枚を表現する。
// アイコンライブラリの「Coins」は硬貨2枚のデザインなので、回転させると2枚投げているように
// 見えてしまう問題があった。単純な円で1枚だけを描くことでそれを避けている。
function CoinFace({ dim }: { dim?: boolean }) {
  return (
    <span
      className={
        'block h-16 w-16 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner ' +
        (dim ? 'opacity-50' : '')
      }
    />
  )
}

// コイントス。タップで振る→表裏。連続トスにも配慮（履歴を残す）。
export function CoinToss() {
  const [face, setFace] = useState<Face | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [tossCount, setTossCount] = useState(0)
  const [history, setHistory] = useState<Face[]>([])

  function toss() {
    if (spinning) return
    setSpinning(true)
    setTossCount((c) => c + 1) // 値を変えて毎回アニメーションを最初から再生させる
    vibrate(12)
    window.setTimeout(() => {
      const result: Face = Math.random() < 0.5 ? '表' : '裏'
      setFace(result)
      setHistory((h) => [result, ...h].slice(0, 20))
      setSpinning(false)
      vibrate([10, 40, 15])
    }, TOSS_DURATION)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={toss}
        disabled={spinning}
        className="flex h-40 w-40 select-none items-center justify-center rounded-full border-4 border-amber-400 text-5xl font-bold text-amber-300 shadow-lg shadow-amber-500/20"
        aria-label="コインをタップしてトスする"
        style={{ perspective: '600px' }}
      >
        <span
          key={tossCount}
          className={
            'inline-flex ' + (spinning ? 'animate-coin-toss' : face ? 'animate-reveal-pop' : '')
          }
        >
          {spinning ? <CoinFace /> : face ? <span>{face}</span> : <CoinFace dim />}
        </span>
      </button>
      <button
        onClick={toss}
        disabled={spinning}
        className="w-full rounded-xl bg-amber-500/90 py-5 text-2xl font-bold text-black transition-transform active:scale-[0.98] active:bg-amber-400 disabled:opacity-50"
      >
        {spinning ? 'トス中…' : 'トスする'}
      </button>

      {history.length > 0 && (
        <div className="w-full">
          <div className="mb-1 text-xs text-slate-400">履歴（新しい順）</div>
          <div className="flex flex-wrap gap-1">
            {history.map((h, i) => (
              <span
                key={i}
                className="rounded bg-white/10 px-2 py-0.5 text-sm text-slate-200"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
