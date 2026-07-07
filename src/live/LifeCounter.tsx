import { useHoldRepeat } from './useHoldRepeat'
import type { PlayerState } from './useBoard'

// 大きい±ボタン。タップで±1、長押しで±5の速い増減。
// compact: 4人対戦など画面が狭いときに少し小さくする。
function AdjustButton({
  sign,
  compact,
  onStep,
}: {
  sign: -1 | 1
  compact?: boolean
  onStep: (delta: number) => void
}) {
  const handlers = useHoldRepeat({
    onTap: () => onStep(sign * 1),
    onHoldStep: () => onStep(sign * 5),
  })
  return (
    <button
      {...handlers}
      className={
        'flex h-full shrink-0 select-none items-center justify-center rounded-2xl bg-white/10 font-bold text-slate-100 active:bg-white/25 ' +
        (compact ? 'w-16 text-4xl' : 'w-28 text-6xl')
      }
      aria-label={sign > 0 ? 'increase' : 'decrease'}
    >
      {sign > 0 ? '＋' : '－'}
    </button>
  )
}

// プレイヤー1人ぶんのライフパネル。親から渡された高さいっぱいに広がる（対面レイアウト用）。
export function LifeCounter({
  player,
  others,
  supportsCommanderDamage,
  compact,
  hideName,
  flipped,
  onToggleFlip,
  onChangeLife,
  onSetLife,
  onCommanderDamage,
}: {
  player: PlayerState
  others: PlayerState[]
  supportsCommanderDamage: boolean
  compact?: boolean
  hideName?: boolean
  flipped: boolean
  onToggleFlip: () => void
  onChangeLife: (delta: number) => void
  onSetLife: (value: number) => void
  onCommanderDamage: (sourceId: string, delta: number) => void
}) {
  function promptManual() {
    const input = window.prompt(`${player.name} のライフを入力`, String(player.life))
    if (input === null) return
    const n = Number(input)
    if (Number.isFinite(n)) onSetLife(Math.trunc(n))
  }

  return (
    <div
      className="flex h-full w-full flex-col rounded-2xl bg-white/5 p-1.5"
      style={{ transform: flipped ? 'rotate(180deg)' : undefined }}
    >
      {/* ヘッダー：名前を中央に、右肩に向き反転ボタン */}
      <div className="relative shrink-0">
        {!hideName && <div className="text-center text-sm text-slate-400">{player.name}</div>}
        <button
          onClick={onToggleFlip}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-base leading-none text-slate-500 active:bg-white/10"
          aria-label="このカウンターの向きを反転"
          title="向きを反転（相手向き ↔ 自分向き）"
        >
          ⇅
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-1.5">
        <AdjustButton sign={-1} compact={compact} onStep={onChangeLife} />
        <button
          onClick={promptManual}
          className="min-w-0 flex-1 select-none text-center font-bold tabular-nums text-white active:opacity-70"
          style={{ fontSize: compact ? 'clamp(2rem, 11vw, 4rem)' : 'clamp(3rem, 20vw, 7.5rem)' }}
          aria-label="ライフ（タップで手入力）"
        >
          {player.life}
        </button>
        <AdjustButton sign={1} compact={compact} onStep={onChangeLife} />
      </div>

      {/* ±5/±10 の分かりやすいチップ（長押しが分からなくてもここで押せる） */}
      <div className="mt-1 flex shrink-0 justify-center gap-1.5">
        {[-10, -5, 5, 10].map((d) => (
          <button
            key={d}
            onClick={() => onChangeLife(d)}
            className="flex-1 rounded-lg bg-white/10 py-2 text-base font-semibold text-slate-200 active:bg-white/25"
          >
            {d > 0 ? `＋${d}` : `−${-d}`}
          </button>
        ))}
      </div>

      {/* 統率者ダメージ（EDH）。各相手からの被ダメを+/-。ライフも連動して減る。 */}
      {supportsCommanderDamage && others.length > 0 && (
        <div className="mt-1 shrink-0 border-t border-white/10 pt-1">
          <div className="mb-1 text-xs text-slate-400">統率者ダメージ（相手別）</div>
          <div className="flex flex-wrap gap-1.5">
            {others.map((o) => {
              const dmg = player.commanderDamage[o.id] ?? 0
              const lethal = dmg >= 21
              return (
                <div
                  key={o.id}
                  className={
                    'flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ' +
                    (lethal ? 'bg-red-500/30 text-red-200' : 'bg-white/10 text-slate-200')
                  }
                >
                  <span className="text-xs text-slate-400">{o.name}</span>
                  <button
                    onClick={() => onCommanderDamage(o.id, -1)}
                    className="px-2 text-lg leading-none active:opacity-60"
                  >
                    −
                  </button>
                  <span className="w-5 text-center tabular-nums">{dmg}</span>
                  <button
                    onClick={() => onCommanderDamage(o.id, 1)}
                    className="px-2 text-lg leading-none active:opacity-60"
                  >
                    ＋
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
