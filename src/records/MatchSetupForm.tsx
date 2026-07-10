import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Repeat, X, Check } from 'lucide-react'
import type { GameProfile, Match } from '../db/types'
import { listDecks, listPlayers, createDeck, createPlayer, getLastMatch } from '../db/repo'
import { DeckPicker } from './DeckPicker'
import { TagPicker } from './TagPicker'
import { PlayerPicker } from './PlayerPicker'
import { useUiPrefs } from '../lib/uiPrefs'

export interface MatchSetupResult {
  date: string
  tags: string[]
  myDeckId?: string
  opponentDeckIds: string[]
  opponentPlayerIds: string[]
  format: Match['format']
  note: string
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// 「この対戦を記録する」の最初の入力画面。日付・タグ・デッキ・プレイヤー・フォーマットを選ぶ。
// ここで作った Match に、各ゲームの結果（先後/マリガン/ライフ推移込み）がぶら下がる。
export function MatchSetupForm({
  profile,
  multi,
  onCancel,
  onSubmit,
}: {
  profile: GameProfile
  multi: boolean
  onCancel: () => void
  onSubmit: (input: MatchSetupResult) => void
}) {
  const { prefs } = useUiPrefs()
  const myDecks = useLiveQuery(() => listDecks(profile.id, true), [profile.id]) ?? []
  const oppDecks = useLiveQuery(() => listDecks(profile.id, false), [profile.id]) ?? []
  const players = useLiveQuery(() => listPlayers(profile.id), [profile.id]) ?? []
  const lastMatch = useLiveQuery(() => getLastMatch(profile.id), [profile.id])

  const [date, setDate] = useState(todayStr())
  const [tags, setTags] = useState<string[]>([])
  const [myDeckId, setMyDeckId] = useState<string | undefined>(undefined)
  const [opponentDeckIds, setOpponentDeckIds] = useState<string[]>([])
  const [opponentPlayerIds, setOpponentPlayerIds] = useState<string[]>([])
  const [format, setFormat] = useState<Match['format']>(multi ? 'EDH-pod' : 'BO1')
  const [note, setNote] = useState('')

  function toggleMyDeck(id: string) {
    setMyDeckId((cur) => (cur === id ? undefined : id))
  }

  function toggleOpponentDeck(id: string) {
    setOpponentDeckIds((cur) => {
      if (multi) return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
      return cur.includes(id) ? [] : [id]
    })
  }

  async function addMyDeck(name: string) {
    const d = await createDeck(profile.id, name, true)
    setMyDeckId(d.id)
  }

  async function addOpponentDeck(name: string) {
    const d = await createDeck(profile.id, name, false)
    setOpponentDeckIds((cur) => (multi ? [...cur, d.id] : [d.id]))
  }

  function toggleOpponentPlayer(id: string) {
    setOpponentPlayerIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  async function addOpponentPlayer(name: string) {
    const p = await createPlayer(profile.id, name)
    setOpponentPlayerIds((cur) => (cur.includes(p.id) ? cur : [...cur, p.id]))
  }

  // 連戦ボタン用：前回のタグ/デッキ/フォーマットの名前を組み立てる
  function deckLabel(id: string | undefined, list: { id: string; name: string }[]): string | undefined {
    return list.find((d) => d.id === id)?.name
  }

  function handleRematch() {
    if (!lastMatch) return
    onSubmit({
      date: todayStr(),
      tags: lastMatch.tags,
      myDeckId: lastMatch.myDeckId,
      opponentDeckIds: lastMatch.opponentDeckIds,
      opponentPlayerIds: lastMatch.opponentPlayerIds ?? [],
      format: lastMatch.format,
      note: '',
    })
  }

  const lastOpponentLabel = lastMatch
    ? lastMatch.opponentDeckIds.map((id) => deckLabel(id, oppDecks) ?? '？').join('・')
    : ''

  return (
    <div className="flex flex-col gap-4">
      {lastMatch && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRematch}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-base font-bold text-white transition-transform active:scale-[0.98] active:bg-violet-500"
          >
            <Repeat size={18} strokeWidth={2} />
            前回と同じ設定で連戦{lastOpponentLabel && `（対 ${lastOpponentLabel}）`}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="h-px flex-1 bg-white/10" />
            または新しく設定する
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 text-xs text-slate-400">日付</div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-white"
        />
      </div>

      {!multi && (
        <div>
          <div className="mb-1 text-xs text-slate-400">フォーマット</div>
          <div className="flex gap-2">
            {(['BO1', 'BO3', 'BO5'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={
                  'flex-1 rounded-lg border py-2 text-sm font-semibold transition-transform active:scale-95 ' +
                  (format === f
                    ? 'border-transparent bg-[var(--accent)] text-white'
                    : 'border-white/10 bg-white/[0.06] text-slate-200')
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {prefs.showTags && <TagPicker profileId={profile.id} selected={tags} onChange={setTags} />}

      {prefs.showMyDeck && (
        <DeckPicker
          label="自分のデッキ"
          decks={myDecks}
          selectedIds={myDeckId ? [myDeckId] : []}
          onToggle={toggleMyDeck}
          onAdd={addMyDeck}
        />
      )}

      {prefs.showOpponentDeck && (
        <DeckPicker
          label={multi ? '対面デッキ（複数選択可）' : '対面デッキ'}
          decks={oppDecks}
          selectedIds={opponentDeckIds}
          onToggle={toggleOpponentDeck}
          onAdd={addOpponentDeck}
        />
      )}

      {prefs.showOpponentPlayer && (
        <PlayerPicker
          players={players}
          selectedIds={opponentPlayerIds}
          onToggle={toggleOpponentPlayer}
          onAdd={addOpponentPlayer}
        />
      )}

      {prefs.showNote && (
        <div>
          <div className="mb-1 text-xs text-slate-400">備考（任意）</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-slate-500"
            placeholder="自由入力"
          />
        </div>
      )}

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
          onClick={() =>
            onSubmit({ date, tags, myDeckId, opponentDeckIds, opponentPlayerIds, format, note })
          }
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 font-bold text-black transition-transform active:scale-[0.98] active:bg-emerald-400"
        >
          <Check size={16} strokeWidth={2.5} />
          記録を開始
        </button>
      </div>
    </div>
  )
}
