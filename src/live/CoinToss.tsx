import { useState } from 'react'

type Face = '表' | '裏'

// コイントス。タップで振る→表裏。連続トスにも配慮（履歴を残す）。
export function CoinToss() {
  const [face, setFace] = useState<Face | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [history, setHistory] = useState<Face[]>([])

  function toss() {
    setSpinning(true)
    // 少しだけ「回ってる」演出をしてから結果を出す。
    window.setTimeout(() => {
      const result: Face = Math.random() < 0.5 ? '表' : '裏'
      setFace(result)
      setHistory((h) => [result, ...h].slice(0, 20))
      setSpinning(false)
    }, 350)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={toss}
        disabled={spinning}
        className={
          'flex h-40 w-40 select-none items-center justify-center rounded-full border-4 text-4xl font-bold transition-transform active:scale-95 ' +
          (spinning
            ? 'animate-spin border-slate-500 text-slate-500'
            : 'border-amber-400 text-amber-300')
        }
        aria-label="コインをタップしてトスする"
      >
        {spinning ? '?' : (face ?? 'コイン')}
      </button>
      <button
        onClick={toss}
        disabled={spinning}
        className="w-full rounded-xl bg-amber-500/90 py-5 text-2xl font-bold text-black active:bg-amber-400 disabled:opacity-50"
      >
        トスする
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
