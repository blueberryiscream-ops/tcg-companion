import type { Match } from '../db/types'

// 1ゲームぶんの結果入力。先後・マリガン・ライフは盤面から自動で埋まった値を表示するだけ
// （DESIGN.md フェーズ2の核心：カウンター操作の結果がそのまま記録に流れ込む）。
// ライフは「変動した回数」ではなく、勝敗決定時点の各プレイヤーの実値を記録する。
export function GameResultForm({
  gameIndex,
  format,
  wins,
  onThePlay,
  mulligans,
  players,
  onResult,
}: {
  gameIndex: number
  format: Match['format']
  wins: { me: number; opponent: number; draw: number }
  onThePlay: 'me' | 'opponent' | null
  mulligans: { me: number; opponent: number }
  players: { name: string; life: number }[]
  onResult: (result: 'win' | 'lose' | 'draw') => void
}) {
  const showTally = format === 'BO3' || format === 'BO5'

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-sm text-slate-400">
        第{gameIndex}ゲーム
        {showTally && (
          <span className="ml-2">
            （現在 {wins.me}-{wins.opponent}）
          </span>
        )}
      </div>

      <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">
        <div>先手: {onThePlay === 'me' ? 'あなた' : onThePlay === 'opponent' ? '相手' : '未決定'}</div>
        <div>
          マリガン: あなた {mulligans.me} / 相手 {mulligans.opponent}
        </div>
        <div>ライフ（この時点）: {players.map((p) => `${p.name} ${p.life}`).join(' / ')}</div>
      </div>

      <div className="text-center text-sm text-slate-400">このゲームの結果は？</div>
      <div className="flex gap-2">
        <button
          onClick={() => onResult('win')}
          className="flex-1 rounded-xl bg-emerald-500 py-5 text-lg font-bold text-black active:bg-emerald-400"
        >
          勝ち
        </button>
        <button
          onClick={() => onResult('draw')}
          className="flex-1 rounded-xl bg-white/10 py-5 text-lg font-bold text-slate-200 active:bg-white/20"
        >
          引き分け
        </button>
        <button
          onClick={() => onResult('lose')}
          className="flex-1 rounded-xl bg-rose-500 py-5 text-lg font-bold text-white active:bg-rose-400"
        >
          負け
        </button>
      </div>
    </div>
  )
}
