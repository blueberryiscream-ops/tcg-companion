import { useState } from 'react'
import { User } from 'lucide-react'
import { vibrate } from '../lib/haptics'

const DECIDE_DURATION = 900
const DECIDE_TICK_START = 80
const DECIDE_TICK_END = 220

// 先後決めフロー: 「コイン/ダイスを振る → 勝った側が先攻/後攻を選ぶ」を1つの流れに。
// 結果を onThePlay（先手が誰か）として親に渡す。
export function PlayDrawFlow({
  onDecided,
}: {
  onDecided: (onThePlay: 'me' | 'opponent') => void
}) {
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null)
  const [rolling, setRolling] = useState(false)
  const [highlight, setHighlight] = useState<'me' | 'opponent' | null>(null)

  function decideWinner() {
    if (rolling) return
    setRolling(true)
    setWinner(null)
    vibrate(12)
    const startedAt = Date.now()

    // ルーレットのように「あなた/相手」のライトを交互に光らせ、だんだんゆっくりにして止める。
    function tick() {
      setHighlight(Math.random() < 0.5 ? 'me' : 'opponent')
      const elapsed = Date.now() - startedAt
      if (elapsed < DECIDE_DURATION) {
        const progress = elapsed / DECIDE_DURATION
        const nextDelay = DECIDE_TICK_START + (DECIDE_TICK_END - DECIDE_TICK_START) * progress
        window.setTimeout(tick, nextDelay)
        return
      }
      const result = Math.random() < 0.5 ? 'me' : 'opponent'
      setWinner(result)
      setHighlight(null)
      setRolling(false)
      vibrate([10, 40, 15])
    }
    tick()
  }

  function choose(first: boolean) {
    if (!winner) return
    // 勝者が先攻を選べば onThePlay=勝者、後攻なら相手側。
    const onThePlay: 'me' | 'opponent' = first
      ? winner
      : winner === 'me'
        ? 'opponent'
        : 'me'
    onDecided(onThePlay)
  }

  const winnerLabel = winner === 'me' ? 'あなた' : '相手'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-400">
        まずコイン/ダイス代わりにボタンを押して、どちらが選ぶ権利を得るか決めます。
      </p>

      {/* 2択のライト。ロール中はどちらかがランダムに交互点灯し、最後に勝者側で止まる。 */}
      <div className="grid grid-cols-2 gap-3">
        {(['me', 'opponent'] as const).map((who) => {
          const lit = rolling ? highlight === who : winner === who
          return (
            <div
              key={who}
              className={
                'flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all duration-100 ' +
                (lit
                  ? 'scale-[1.03] border-violet-400 bg-violet-500/20 shadow-lg shadow-violet-500/25'
                  : 'border-white/10 bg-white/5')
              }
            >
              <User size={26} strokeWidth={1.75} className={lit ? 'text-violet-300' : 'text-slate-500'} />
              <span className={'text-sm font-semibold ' + (lit ? 'text-violet-200' : 'text-slate-400')}>
                {who === 'me' ? 'あなた' : '相手'}
              </span>
            </div>
          )
        })}
      </div>

      <button
        onClick={decideWinner}
        disabled={rolling}
        className="rounded-xl bg-violet-500 py-4 text-xl font-bold text-white transition-transform active:scale-[0.98] active:bg-violet-400 disabled:opacity-80"
      >
        {rolling ? '決めています…' : '振って決める'}
      </button>

      {winner && !rolling && (
        <div className="animate-reveal-pop flex flex-col gap-3 rounded-xl border border-violet-400/20 bg-white/5 p-4">
          <div className="text-center text-lg">
            <span className="font-bold text-violet-300">{winnerLabel}</span> が選びます
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => choose(true)}
              className="flex-1 rounded-xl border border-white/10 bg-white/10 py-4 text-lg font-semibold transition-transform active:scale-[0.98] active:bg-white/25"
            >
              先攻
            </button>
            <button
              onClick={() => choose(false)}
              className="flex-1 rounded-xl border border-white/10 bg-white/10 py-4 text-lg font-semibold transition-transform active:scale-[0.98] active:bg-white/25"
            >
              後攻
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
