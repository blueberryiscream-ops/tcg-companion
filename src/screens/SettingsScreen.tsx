import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { GameProfile } from '../db/types'
import { listDecks, createDeck, listPlayers, createPlayer } from '../db/repo'
import { exportBackup, importBackup } from '../db/backup'
import { DeckPicker } from '../records/DeckPicker'
import { TagPicker } from '../records/TagPicker'
import { PlayerPicker } from '../records/PlayerPicker'
import { useUiPrefs, type UiPrefs } from '../lib/uiPrefs'
import { WAKE_LOCK_SUPPORTED } from '../lib/useWakeLock'
import { HOME_WALLPAPER_ID } from '../db/wallpaper'
import { WallpaperSection } from './WallpaperSection'

// データのバックアップ（全体書き出し/読み込み）。DESIGN.mdのSyncAdapter構想に対応。
function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイルを連続で選んでもchangeが発火するように
    if (!file) return
    const ok = window.confirm(
      'バックアップを読み込みます。今のデータに上書き・追加されます（削除はされません）。よろしいですか？',
    )
    if (!ok) return
    const result = await importBackup(file)
    setMessage(result.message)
  }

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-lg font-semibold">データのバックアップ</h2>
      <p className="mb-2 text-xs text-slate-500">
        全データを1つのファイルに書き出せます。機種変更のときや、念のための保存用に。
        <br />
        書き出し先をGoogleドライブ等の同期フォルダにしておくと、PCとの同期にもそのまま使えます。
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => exportBackup()}
          className="flex-1 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-slate-200 active:bg-white/20"
        >
          ⬇ 書き出し
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-slate-200 active:bg-white/20"
        >
          ⬆ 読み込み
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
      {message && <p className="mt-2 text-xs text-emerald-300">{message}</p>}
    </div>
  )
}

// 選択機能は使わず、並び替え・改名・削除だけを目的にデッキのチップ群を表示する。
// 「対戦を記録する」画面で使っているのと同じ見た目・同じ操作方法。
function DeckManageSection({ profileId, isMine }: { profileId: string; isMine: boolean }) {
  const decks = useLiveQuery(() => listDecks(profileId, isMine), [profileId, isMine]) ?? []

  async function handleAdd(name: string) {
    await createDeck(profileId, name, isMine)
  }

  return (
    <DeckPicker
      label={isMine ? '自分のデッキ' : '対面デッキ'}
      decks={decks}
      selectedIds={[]}
      onAdd={handleAdd}
    />
  )
}

function PlayerManageSection({ profileId }: { profileId: string }) {
  const players = useLiveQuery(() => listPlayers(profileId), [profileId]) ?? []

  async function handleAdd(name: string) {
    await createPlayer(profileId, name)
  }

  return <PlayerPicker players={players} selectedIds={[]} onToggle={() => {}} onAdd={handleAdd} />
}

// 表示するかどうかのスイッチ1行。
function PrefToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-left"
    >
      <span className="text-sm text-slate-200">{label}</span>
      <span
        className={
          'flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ' +
          (checked ? 'justify-end bg-sky-500' : 'justify-start bg-white/15')
        }
      >
        <span className="h-5 w-5 rounded-full bg-white" />
      </span>
    </button>
  )
}

// 設定タブ。内蔵ゲームプロファイルの一覧表示 ＋ 表示のカスタマイズ ＋ デッキ・タグ・プレイヤーの整理。
export function SettingsScreen({ profiles }: { profiles: GameProfile[] }) {
  const [manageProfileId, setManageProfileId] = useState<string | null>(null)
  const manageProfile = profiles.find((p) => p.id === manageProfileId) ?? null
  const [dummyTags, setDummyTags] = useState<string[]>([])
  const { prefs, setPref } = useUiPrefs()

  function setBoolPref<K extends keyof UiPrefs>(key: K, value: boolean) {
    setPref(key, value as UiPrefs[K])
  }

  return (
    <div className="p-4">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">設定</h1>
      <p className="mb-4 text-sm text-slate-400">ゲームのプリセット（内蔵）</p>

      <div className="flex flex-col gap-3">
        {profiles.map((p) => (
          <div key={p.id} className="rounded-xl bg-white/5 p-3">
            <div className="font-semibold">{p.name}</div>
            <div className="mt-1 text-sm text-slate-400">
              開始ライフ {p.startingLife} / 既定 {p.playerCountDefault}人
              {p.supportsCommanderDamage && ' / 統率者ダメージ対応'}
            </div>
            {p.counterTypes.length > 0 && (
              <div className="mt-1 text-xs text-slate-500">
                カウンター: {p.counterTypes.map((c) => c.label).join('・')}
              </div>
            )}
            <div className="mt-1 text-xs text-slate-500">
              ダイス既定: {p.diceDefaults.join('・')}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">ホーム画面の壁紙</h2>
        <WallpaperSection
          id={HOME_WALLPAPER_ID}
          title="「対戦」タブ最初の『ゲームを選ぶ』画面の壁紙"
          description="任意の画像をこの端末に保存して、ゲームを選ぶ画面全体の背景にできます。文字が読みやすいよう自動で暗幕をかけ、縦長の画像は上側（顔まわり）を優先して切り抜きます。画像はこの端末だけに保存され、バックアップの書き出しには含まれません。"
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">表示のカスタマイズ</h2>
        <p className="mb-2 text-xs text-slate-500">
          使わない項目を消してシンプルにしたり、操作に慣れたらライブ画面の文字を減らせます。
        </p>
        <div className="flex flex-col gap-1.5">
          <PrefToggle
            label="記録画面：タグ欄"
            checked={prefs.showTags}
            onChange={(v) => setBoolPref('showTags', v)}
          />
          <PrefToggle
            label="記録画面：自分のデッキ欄"
            checked={prefs.showMyDeck}
            onChange={(v) => setBoolPref('showMyDeck', v)}
          />
          <PrefToggle
            label="記録画面：対面デッキ欄"
            checked={prefs.showOpponentDeck}
            onChange={(v) => setBoolPref('showOpponentDeck', v)}
          />
          <PrefToggle
            label="記録画面：対面プレイヤー欄"
            checked={prefs.showOpponentPlayer}
            onChange={(v) => setBoolPref('showOpponentPlayer', v)}
          />
          <PrefToggle
            label="記録画面：備考欄"
            checked={prefs.showNote}
            onChange={(v) => setBoolPref('showNote', v)}
          />
          <PrefToggle
            label="対戦画面の文字を減らす（アイコンのみ表示）"
            checked={prefs.compactLiveScreen}
            onChange={(v) => setBoolPref('compactLiveScreen', v)}
          />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">画面・電池</h2>
        {WAKE_LOCK_SUPPORTED ? (
          <>
            <PrefToggle
              label="対戦中に画面が自動で消えないようにする"
              checked={prefs.wakeLockEnabled}
              onChange={(v) => setBoolPref('wakeLockEnabled', v)}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              ONにすると対戦（対戦タブを見ている間）は画面が暗くなりません。バッテリーの減りは早くなります。
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            この端末・ブラウザは画面の自動消灯を防ぐ機能に対応していません。
          </p>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">デッキ・タグ・プレイヤーの整理</h2>
        <p className="mb-2 text-xs text-slate-500">
          「対戦を記録する」画面と同じチップです。右上の「編集」で、ドラッグ並び替え・タップで改名・✕で削除ができます。
        </p>
        <select
          value={manageProfileId ?? ''}
          onChange={(e) => setManageProfileId(e.target.value || null)}
          className="mb-3 w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white"
        >
          <option value="">ゲームを選択...</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {manageProfile && (
          <div className="flex flex-col gap-4">
            <WallpaperSection
              id={manageProfile.id}
              title="このゲームの壁紙（対戦中の背景）"
              description="任意の画像をこの端末に保存して、対戦中のライフ画面の背景にできます。文字が読みやすいよう自動で暗幕をかけ、縦長の画像は上側（顔まわり）を優先して切り抜きます。画像はこの端末だけに保存され、バックアップの書き出しには含まれません。"
            />
            <DeckManageSection profileId={manageProfile.id} isMine={true} />
            <DeckManageSection profileId={manageProfile.id} isMine={false} />
            <PlayerManageSection profileId={manageProfile.id} />
            <TagPicker profileId={manageProfile.id} selected={dummyTags} onChange={setDummyTags} />
          </div>
        )}
      </div>

      <BackupSection />

      <p className="mt-6 text-xs text-slate-600">
        データはこの端末の中（ブラウザ）だけに保存されます。サーバー送信なし・費用0円。
      </p>
    </div>
  )
}
