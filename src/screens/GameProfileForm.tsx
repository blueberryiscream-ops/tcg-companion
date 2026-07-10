import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { ALL_DICE_TYPES, type DieType, type CounterType, type GameProfile } from '../db/types'
import { createGameProfile, updateGameProfile, type GameProfileInput } from '../db/profiles'
import { PrefToggle } from '../components/PrefToggle'
import { DEFAULT_ACCENT } from '../lib/color'
import { newId } from '../lib/id'

// ゲームプロファイルを作る／直すフォーム。
// profile を渡すと「編集」、渡さなければ「新規作成」として振る舞う（DESIGN.md §12-1）。
// カウンターの種類は自由入力（毒/エネルギーのような細かい対応は用意しない）。
export function GameProfileForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile?: GameProfile | null
  onCancel: () => void
  onSaved: (profile: GameProfile) => void
}) {
  const isEdit = !!profile
  const [name, setName] = useState(profile?.name ?? '')
  const [hasLifeCounter, setHasLifeCounter] = useState(profile?.hasLifeCounter ?? true)
  const [startingLife, setStartingLife] = useState(profile?.startingLife ?? 20)
  const [playerCountDefault, setPlayerCountDefault] = useState(profile?.playerCountDefault ?? 2)
  const [supportsCommanderDamage, setSupportsCommanderDamage] = useState(
    profile?.supportsCommanderDamage ?? false,
  )
  // 編集時は既存の key をそのまま持ち回る。key が変わると、対戦中の盤面に入っている
  // カウンターの値が別物として扱われてしまうため。
  const [counters, setCounters] = useState<CounterType[]>(profile?.counterTypes ?? [])
  const [newCounterLabel, setNewCounterLabel] = useState('')
  const [diceDefaults, setDiceDefaults] = useState<DieType[]>(profile?.diceDefaults ?? ['d6'])
  const [accentColor, setAccentColor] = useState(profile?.accentColor ?? DEFAULT_ACCENT)
  const [submitting, setSubmitting] = useState(false)

  function addCounter() {
    const label = newCounterLabel.trim()
    if (!label) return
    setCounters((cs) => [...cs, { key: `c_${newId()}`, label, defaultValue: 0 }])
    setNewCounterLabel('')
  }

  function removeCounter(key: string) {
    setCounters((cs) => cs.filter((c) => c.key !== key))
  }

  function toggleDie(d: DieType) {
    setDiceDefaults((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]))
  }

  const canSubmit = name.trim().length > 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    const input: GameProfileInput = {
      name: name.trim(),
      hasLifeCounter,
      startingLife: hasLifeCounter ? startingLife : 0,
      playerCountDefault: Math.max(2, playerCountDefault || 2),
      supportsCommanderDamage: hasLifeCounter && supportsCommanderDamage,
      counterTypes: counters,
      diceDefaults: diceDefaults.length > 0 ? diceDefaults : ['d6'],
      accentColor,
    }
    if (profile) {
      await updateGameProfile(profile.id, input)
      setSubmitting(false)
      onSaved({ ...profile, ...input })
    } else {
      const created = await createGameProfile(input)
      setSubmitting(false)
      onSaved(created)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isEdit && (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
          設定を変えても、このゲームの対戦記録・デッキはそのまま残ります。
          {profile?.isBuiltIn && '（内蔵ゲームは「初期設定に戻す」でいつでも元に戻せます）'}
        </p>
      )}

      <div>
        <div className="mb-1 text-xs text-slate-400">ゲーム名</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: ポケモンカード"
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div>
        <div className="mb-1 text-xs text-slate-400">既定の人数</div>
        <input
          type="number"
          min={2}
          max={8}
          value={playerCountDefault}
          onChange={(e) => setPlayerCountDefault(Number(e.target.value))}
          className="w-24 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
        />
      </div>

      <PrefToggle label="ライフを使う" checked={hasLifeCounter} onChange={setHasLifeCounter} />

      {hasLifeCounter && (
        <>
          <div>
            <div className="mb-1 text-xs text-slate-400">開始ライフ</div>
            <input
              type="number"
              value={startingLife}
              onChange={(e) => setStartingLife(Number(e.target.value))}
              className="w-24 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
            />
          </div>
          <PrefToggle
            label="統率者ダメージに対応する（EDHのような多人数戦向け）"
            checked={supportsCommanderDamage}
            onChange={setSupportsCommanderDamage}
          />
        </>
      )}

      <div>
        <div className="mb-1 text-xs text-slate-400">その他カウンター（毒・エール等・任意）</div>
        <div className="mb-2 flex flex-wrap gap-2">
          {counters.map((c) => (
            <span
              key={c.key}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-slate-200"
            >
              {c.label}
              <button type="button" onClick={() => removeCounter(c.key)} aria-label={`${c.label}を削除`}>
                <X size={13} strokeWidth={2.5} className="text-slate-500" />
              </button>
            </span>
          ))}
          {counters.length === 0 && <span className="text-sm text-slate-500">まだありません</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={newCounterLabel}
            onChange={(e) => setNewCounterLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCounter()
              }
            }}
            placeholder="+ カウンター名"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={addCounter}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm active:bg-white/15"
          >
            <Plus size={15} strokeWidth={2.5} />
            追加
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-slate-400">ダイス既定（複数選択可）</div>
        <div className="grid grid-cols-4 gap-2">
          {ALL_DICE_TYPES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDie(d)}
              className={
                'rounded-lg border py-2 text-sm font-semibold transition-transform active:scale-95 ' +
                (diceDefaults.includes(d)
                  ? 'border-transparent bg-[var(--accent)] text-white'
                  : 'border-white/10 bg-white/[0.06] text-slate-200')
              }
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-slate-400">アクセント色（ボタン等の強調色）</div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-10 w-16 rounded-lg border border-white/10 bg-transparent"
          />
          <span className="text-sm text-slate-400">{accentColor}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-3 font-semibold transition-transform active:scale-[0.98] active:bg-white/15"
        >
          <X size={16} strokeWidth={2} />
          やめる
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 font-bold text-black transition-transform active:scale-[0.98] active:bg-emerald-400 disabled:opacity-40"
        >
          <Check size={16} strokeWidth={2.5} />
          {isEdit ? '保存する' : '作成する'}
        </button>
      </div>
    </div>
  )
}
