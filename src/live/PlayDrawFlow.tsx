import { useState } from 'react'

// 先後決めフロー: 「コイン/ダイスを振る → 勝った側が先攻/後攻を選ぶ」を1つの流れに。
// 結果を onThePlay（先手が誰か）として親に渡す。
export function PlayDrawFlow({
  onDecided,
}: {
  onDecided: (onThePlay: 'me' | 'opponent') => void
}) {
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null)
  const [rolling, setRolling] = useState(false)

  function decideWinner() {
    setRolling(true)
    setWinner(null)
    window.setTimeout(() => {
      setWinner(Math.random() < 0.5 ? 'me' : 'opponent')
      setRolling(false)
    }, 400)
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

      <button
        onClick={decideWinner}
        disabled={rolling}
        className="rounded-xl bg-violet-500 py-4 text-xl font-bold text-white active:bg-violet-400 disabled:opacity-50"
      >
        {rolling ? '…' : '振って決める'}
      </button>

      {winner && !rolling && (
        <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-4">
          <div className="text-center text-lg">
            <span className="font-bold text-violet-300">{winnerLabel}</span> が選びます
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => choose(true)}
              className="flex-1 rounded-xl bg-white/10 py-4 text-lg font-semibold active:bg-white/25"
            >
              先攻
            </button>
            <button
              onClick={() => choose(false)}
              className="flex-1 rounded-xl bg-white/10 py-4 text-lg font-semibold active:bg-white/25"
            >
              後攻
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
