import { useState } from 'react'
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react'
import { ALL_DICE_TYPES, type DieType } from '../db/types'
import { vibrate } from '../lib/haptics'

const ALL_DICE = ALL_DICE_TYPES
const TUMBLE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]

function sides(die: DieType): number {
  return Number(die.slice(1))
}

interface RollResult {
  die: DieType
  count: number
  rolls: number[]
  total: number
}

const ROLL_DURATION = 550
const ROLL_TICK = 90

// ダイスロール。面数フルセット・個数指定・合計・履歴。
export function DiceRoller({ defaults }: { defaults: DieType[] }) {
  const [die, setDie] = useState<DieType>(defaults[0] ?? 'd6')
  const [count, setCount] = useState(1)
  const [last, setLast] = useState<RollResult | null>(null)
  const [history, setHistory] = useState<RollResult[]>([])
  const [rolling, setRolling] = useState(false)
  // ロール中に表情を高速で切り替える「転がっているダイス」の見た目（1〜6の目をランダムに表示するだけの演出用）。
  const [tumbleFace, setTumbleFace] = useState(0)

  function roll() {
    if (rolling) return
    setRolling(true)
    vibrate(12)
    const n = sides(die)
    const startedAt = Date.now()

    function tick() {
      setTumbleFace(Math.floor(Math.random() * 6))
      if (Date.now() - startedAt < ROLL_DURATION) {
        window.setTimeout(tick, ROLL_TICK)
        return
      }
      const rolls: number[] = []
      for (let i = 0; i < count; i++) rolls.push(1 + Math.floor(Math.random() * n))
      const result: RollResult = { die, count, rolls, total: rolls.reduce((a, b) => a + b, 0) }
      vibrate([10, 40, 15])
      setLast(result)
      setHistory((h) => [result, ...h].slice(0, 20))
      setRolling(false)
    }
    tick()
  }

  const TumbleIcon = TUMBLE_ICONS[tumbleFace]

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
              (d === die ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-slate-200 active:bg-white/20')
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
        disabled={rolling}
        className="rounded-xl bg-[var(--accent)] py-5 text-2xl font-bold text-white transition-transform active:scale-[0.98] active:opacity-80 disabled:opacity-70"
      >
        {rolling ? '振っています…' : `${count}${die} を振る`}
      </button>

      {/* 直近の結果。ロール中は1〜6の目を高速切り替え表示しながら跳ねて転がる演出。 */}
      {(last || rolling) && (
        <div className="flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          {rolling ? (
            <span className="animate-dice-tumble inline-flex">
              <TumbleIcon size={52} strokeWidth={1.5} className="text-[var(--accent)]" />
            </span>
          ) : (
            <div className="animate-reveal-pop text-5xl font-bold tabular-nums text-[var(--accent)]">
              {last!.total}
            </div>
          )}
          {!rolling && last!.count > 1 && (
            <div className="mt-1 text-sm text-slate-400">
              内訳: {last!.rolls.join(' + ')}
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
