import { FlipVertical2 } from 'lucide-react'
import { useHoldRepeat } from './useHoldRepeat'
import type { PlayerState } from './useBoard'
import type { CounterType } from '../db/types'

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
        'flex h-full shrink-0 select-none items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] font-bold text-slate-100 shadow-sm shadow-black/10 transition-transform active:scale-[0.97] active:bg-white/15 ' +
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
  hasLifeCounter,
  supportsCommanderDamage,
  counterTypes,
  compact,
  hideName,
  flipped,
  onToggleFlip,
  onChangeLife,
  onSetLife,
  onCommanderDamage,
  onChangeCounter,
}: {
  player: PlayerState
  others: PlayerState[]
  hasLifeCounter: boolean
  supportsCommanderDamage: boolean
  counterTypes: CounterType[]
  compact?: boolean
  hideName?: boolean
  flipped: boolean
  onToggleFlip: () => void
  onChangeLife: (delta: number) => void
  onSetLife: (value: number) => void
  onCommanderDamage: (sourceId: string, delta: number) => void
  onChangeCounter: (key: string, delta: number) => void
}) {
  function promptManual() {
    const input = window.prompt(`${player.name} のライフを入力`, String(player.life))
    if (input === null) return
    const n = Number(input)
    if (Number.isFinite(n)) onSetLife(Math.trunc(n))
  }

  return (
    <div
      className="flex h-full w-full flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-1.5 shadow-md shadow-black/20"
      style={{ transform: flipped ? 'rotate(180deg)' : undefined }}
    >
      {/* ヘッダー：名前を中央に、右肩に向き反転ボタン。
          名前を隠していても⇅ボタンの場所を確保するため最小の高さを固定しておく
          （absolute配置のボタンだけになって高さ0になり下の要素と重なるのを防ぐ）。 */}
      <div className="relative min-h-[1.4rem] shrink-0">
        {!hideName && (
          <div className="text-center text-sm font-medium tracking-wide text-slate-400">
            {player.name}
          </div>
        )}
        <button
          onClick={onToggleFlip}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 active:bg-white/10 active:text-slate-300"
          aria-label="このカウンターの向きを反転"
          title="向きを反転（相手向き ↔ 自分向き）"
        >
          <FlipVertical2 size={15} strokeWidth={2} />
        </button>
      </div>

      {/* ライフ（プロファイルで使わない設定にしているゲームでは丸ごと非表示にできる）。 */}
      {hasLifeCounter && (
        <>
          <div className="flex min-h-0 flex-1 items-stretch justify-center gap-1.5">
            <AdjustButton sign={-1} compact={compact} onStep={onChangeLife} />
            <button
              onClick={promptManual}
              className="min-w-0 flex-1 select-none text-center font-bold tabular-nums text-white transition-opacity active:opacity-70"
              style={{
                fontSize: compact ? 'clamp(2rem, 11vw, 4rem)' : 'clamp(3rem, 20vw, 7.5rem)',
                textShadow: '0 2px 12px rgba(0,0,0,0.35)',
              }}
              aria-label="ライフ（タップで手入力）"
            >
              {player.life}
            </button>
            <AdjustButton sign={1} compact={compact} onStep={onChangeLife} />
          </div>

          {/* ±5/±10 の分かりやすいチップ（長押しが分からなくてもここで押せる） */}
          <div className={'flex shrink-0 justify-center ' + (compact ? 'mt-0.5 gap-1' : 'mt-1 gap-1.5')}>
            {[-10, -5, 5, 10].map((d) => (
              <button
                key={d}
                onClick={() => onChangeLife(d)}
                className={
                  'flex-1 rounded-lg border border-white/10 bg-white/[0.06] font-semibold text-slate-200 transition-transform active:scale-95 active:bg-white/15 ' +
                  (compact ? 'py-1 text-xs' : 'py-2 text-base')
                }
              >
                {d > 0 ? `＋${d}` : `−${-d}`}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ライフを使わないゲームでは、名前欄の下の空間をこのまま余白として使う。 */}
      {!hasLifeCounter && <div className="min-h-0 flex-1" />}

      {/* 統率者ダメージ（EDH）。各相手からの被ダメを+/-。ライフも連動して減る。
          compact時は見出し・余白・文字を大きく詰めて、狭い画面でのゴチャつきを防ぐ。 */}
      {supportsCommanderDamage && others.length > 0 && (
        <div
          className={
            'shrink-0 border-t border-white/10 ' + (compact ? 'mt-0.5 pt-0.5' : 'mt-1 pt-1')
          }
        >
          <div className={compact ? 'text-[9px] text-slate-500' : 'mb-1 text-xs text-slate-400'}>
            統率者ダメージ
          </div>
          {/* 折り返さず横一列に固定（縦回転パネルで2行に折り返すと重なって見えるため、
              収まらない分は横スクロールにする）。 */}
          <div className={'flex flex-nowrap overflow-x-auto ' + (compact ? 'gap-1' : 'gap-1.5')}>
            {others.map((o) => {
              const dmg = player.commanderDamage[o.id] ?? 0
              const lethal = dmg >= 21
              return (
                <div
                  key={o.id}
                  className={
                    'flex shrink-0 items-center rounded-lg ' +
                    (compact ? 'gap-0.5 px-1 py-0.5 text-xs' : 'gap-1 px-2 py-1.5 text-sm') +
                    ' ' +
                    (lethal ? 'bg-red-500/30 text-red-200' : 'bg-white/10 text-slate-200')
                  }
                >
                  <span className={compact ? 'text-[9px] text-slate-400' : 'text-xs text-slate-400'}>
                    {o.name}
                  </span>
                  <button
                    onClick={() => onCommanderDamage(o.id, -1)}
                    className={
                      'leading-none active:opacity-60 ' + (compact ? 'px-1' : 'px-2 text-lg')
                    }
                  >
                    −
                  </button>
                  <span className={'text-center tabular-nums ' + (compact ? 'w-4' : 'w-5')}>
                    {dmg}
                  </span>
                  <button
                    onClick={() => onCommanderDamage(o.id, 1)}
                    className={
                      'leading-none active:opacity-60 ' + (compact ? 'px-1' : 'px-2 text-lg')
                    }
                  >
                    ＋
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* その他の自由カウンター（毒・エール等）。プロファイルで定義した分だけ並ぶ。 */}
      {counterTypes.length > 0 && (
        <div
          className={
            'shrink-0 border-t border-white/10 ' + (compact ? 'mt-0.5 pt-0.5' : 'mt-1 pt-1')
          }
        >
          {/* 折り返さず横一列に固定（縦回転パネルで2行に折り返すと重なって見えるため、
              収まらない分は横スクロールにする）。 */}
          <div className={'flex flex-nowrap overflow-x-auto ' + (compact ? 'gap-1' : 'gap-1.5')}>
            {counterTypes.map((c) => {
              const value = player.counters?.[c.key] ?? c.defaultValue
              return (
                <div
                  key={c.key}
                  className={
                    'flex shrink-0 items-center rounded-lg bg-white/10 text-slate-200 ' +
                    (compact ? 'gap-0.5 px-1 py-0.5 text-xs' : 'gap-1 px-2 py-1.5 text-sm')
                  }
                >
                  <span className={compact ? 'text-[9px] text-slate-400' : 'text-xs text-slate-400'}>
                    {c.label}
                  </span>
                  <button
                    onClick={() => onChangeCounter(c.key, -1)}
                    className={
                      'leading-none active:opacity-60 ' + (compact ? 'px-1' : 'px-2 text-lg')
                    }
                  >
                    −
                  </button>
                  <span className={'text-center tabular-nums ' + (compact ? 'w-4' : 'w-5')}>
                    {value}
                  </span>
                  <button
                    onClick={() => onChangeCounter(c.key, 1)}
                    className={
                      'leading-none active:opacity-60 ' + (compact ? 'px-1' : 'px-2 text-lg')
                    }
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
