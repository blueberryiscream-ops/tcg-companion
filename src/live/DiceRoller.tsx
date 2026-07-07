import { useState } from 'react'
import type { DieType } from '../db/types'

const ALL_DICE: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

function sides(die: DieType): number {
  return Number(die.slice(1))
}

interface RollResult {
  die: DieType
  count: number
  rolls: number[]
  total: number
}

// ダイスロール。面数フルセット・個数指定・合計・履歴。
export function DiceRoller({ defaults }: { defaults: DieType[] }) {
  const [die, setDie] = useState<DieType>(defaults[0] ?? 'd6')
  const [count, setCount] = useState(1)
  const [last, setLast] = useState<RollResult | null>(null)
  const [history, setHistory] = useState<RollResult[]>([])

  function roll() {
    const n = sides(die)
    const rolls: number[] = []
    for (let i = 0; i < count; i++) {
      rolls.push(1 + Math.floor(Math.random() * n))
    }
    const result: RollResult = {
      die,
      count,
      rolls,
      total: rolls.reduce((a, b) => a + b, 0),
    }
    setLast(result)
    setHistory((h) => [result, ...h].slice(0, 20))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 面数を選ぶ */}
      <div className="grid grid-cols-4 gap-2">
        {ALL_DICE.map((d) => (
          <button
            key={d}
            onClick={() => setDie(d)}
            className={
              'rounded-lg py-3 text-base font-semibold ' +
              (d === die ? 'bg-sky-500 text-white' : 'bg-white/10 text-slate-200 active:bg-white/20')
            }
          >
            {d}
          </button>
        ))}
      </div>

      {/* 個数 */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm text-slate-400">個数</span>
        <button
          onClick={() => setCount((c) => Math.max(1, c - 1))}
          className="h-14 w-14 rounded-lg bg-white/10 text-3xl active:bg-white/20"
        >
          −
        </button>
        <span className="w-10 text-center text-3xl font-bold tabular-nums">{count}</span>
        <button
          onClick={() => setCount((c) => Math.min(30, c + 1))}
          className="h-14 w-14 rounded-lg bg-white/10 text-3xl active:bg-white/20"
        >
          ＋
        </button>
      </div>

      <button
        onClick={roll}
        className="rounded-xl bg-sky-500 py-5 text-2xl font-bold text-white active:bg-sky-400"
      >
        {count}{die} を振る
      </button>

      {/* 直近の結果 */}
      {last && (
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <div className="text-5xl font-bold tabular-nums text-sky-300">{last.total}</div>
          {last.count > 1 && (
            <div className="mt-1 text-sm text-slate-400">
              内訳: {last.rolls.join(' + ')}
            </div>
          )}
        </div>
      )}

      {/* 履歴 */}
      {history.length > 0 && (
        <div>
          <div className="mb-1 text-xs text-slate-400">履歴（新しい順）</div>
          <div className="flex flex-col gap-1">
            {history.map((h, i) => (
              <div key={i} className="flex justify-between rounded bg-white/5 px-2 py-1 text-sm">
                <span className="text-slate-400">
                  {h.count}
                  {h.die}
                </span>
                <span className="tabular-nums text-slate-200">
                  = {h.total}
                  {h.count > 1 && (
                    <span className="ml-1 text-slate-500">({h.rolls.join(',')})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
