import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Download,
  Upload,
  Gamepad2,
  Image,
  SlidersHorizontal,
  BatteryCharging,
  Layers,
  ChevronDown,
  DatabaseBackup,
  Clock,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react'
import type { GameProfile } from '../db/types'
import { listDecks, createDeck, listPlayers, createPlayer, countAllMatches } from '../db/repo'
import { exportBackup, importBackup } from '../db/backup'
import { getLastBackupAt, daysSince, REMINDER_THRESHOLD_DAYS } from '../lib/backupReminder'
import { deleteGameProfile } from '../db/profiles'
import { DeckPicker } from '../records/DeckPicker'
import { TagPicker } from '../records/TagPicker'
import { PlayerPicker } from '../records/PlayerPicker'
import { useUiPrefs, type UiPrefs } from '../lib/uiPrefs'
import { WAKE_LOCK_SUPPORTED } from '../lib/useWakeLock'
import { FULLSCREEN_SUPPORTED } from '../lib/useFullscreen'
import { HOME_WALLPAPER_ID } from '../db/wallpaper'
import { WallpaperSection } from './WallpaperSection'
import { GameProfileForm } from './GameProfileForm'
import { HelpSection } from './HelpSection'
import { PrefToggle } from '../components/PrefToggle'
import { Sheet } from '../components/Sheet'

// 設定タブの見出し1行。アイコン付きでどこに何があるか一目で分かるようにする。
function SectionHeading({ icon: Icon, children }: { icon: typeof Gamepad2; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-1.5 text-lg font-semibold tracking-tight">
      <Icon size={18} strokeWidth={1.75} className="text-slate-400" />
      {children}
    </h2>
  )
}

// データのバックアップ（全体書き出し/読み込み）。DESIGN.mdのSyncAdapter構想に対応。
function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [lastBackupAt, setLastBackupAt] = useState(() => getLastBackupAt())
  const matchCount = useLiveQuery(() => countAllMatches(), []) ?? 0

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

  async function handleExport() {
    await exportBackup() // 内部で recordBackupNow() 済み
    setLastBackupAt(getLastBackupAt())
  }

  // 対戦記録が1件もないうちは急かさない。記録があるのに「一度も」or「しばらく」書き出していない時だけ、そっと知らせる。
  const staleDays = lastBackupAt ? daysSince(lastBackupAt) : null
  const showReminder = matchCount > 0 && (staleDays === null || staleDays >= REMINDER_THRESHOLD_DAYS)

  return (
    <div className="mt-6">
      <SectionHeading icon={DatabaseBackup}>データのバックアップ</SectionHeading>
      <p className="mb-2 text-xs text-slate-500">
        全データを1つのファイルに書き出せます。機種変更のときや、念のための保存用に。
        <br />
        書き出し先をGoogleドライブ等の同期フォルダにしておくと、PCとの同期にもそのまま使えます。
      </p>
      {showReminder && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <Clock size={14} strokeWidth={2} className="shrink-0" />
          {staleDays === null
            ? 'まだ一度もバックアップを書き出していません。念のため一度書き出しておくと安心です。'
            : `前回の書き出しから${staleDays}日経っています。そろそろ書き出しておくと安心です。`}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-slate-200 transition-transform active:scale-[0.98] active:bg-white/15"
        >
          <Download size={16} strokeWidth={1.75} />
          書き出し
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-slate-200 transition-transform active:scale-[0.98] active:bg-white/15"
        >
          <Upload size={16} strokeWidth={1.75} />
          読み込み
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


// 設定タブ。ゲームプロファイルの一覧表示（内蔵＋ユーザー追加） ＋ 表示のカスタマイズ ＋ デッキ・タグ・プレイヤーの整理。
export function SettingsScreen({ profiles }: { profiles: GameProfile[] }) {
  const [manageProfileId, setManageProfileId] = useState<string | null>(null)
  const manageProfile = profiles.find((p) => p.id === manageProfileId) ?? null
  const [dummyTags, setDummyTags] = useState<string[]>([])
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const { prefs, setPref } = useUiPrefs()

  function setBoolPref<K extends keyof UiPrefs>(key: K, value: boolean) {
    setPref(key, value as UiPrefs[K])
  }

  async function handleDeleteProfile(p: GameProfile) {
    const ok = window.confirm(
      `「${p.name}」を削除しますか？\n⚠️ このゲームのデッキ・タグ・プレイヤー・対戦記録もすべて削除されます。\n` +
        'バックアップを書き出していれば、そこから復元できます。',
    )
    if (!ok) return
    await deleteGameProfile(p.id)
    if (manageProfileId === p.id) setManageProfileId(null)
  }

  return (
    <div className="p-4">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">設定</h1>
      <p className="mb-4 text-sm text-slate-400">ゲームプロファイル（内蔵＋追加分）</p>

      <button
        onClick={() => setShowHelp(true)}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-slate-200 transition-transform active:scale-[0.98] active:bg-white/15"
      >
        <HelpCircle size={17} strokeWidth={1.75} />
        使い方・よくある質問
      </button>
      <Sheet open={showHelp} title="使い方・よくある質問" onClose={() => setShowHelp(false)}>
        <HelpSection />
      </Sheet>

      <div className="flex flex-col gap-3">
        {profiles.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <Gamepad2 size={16} strokeWidth={1.75} className="text-slate-500" />
                {p.name}
              </div>
              {!p.isBuiltIn && (
                <button
                  onClick={() => handleDeleteProfile(p)}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors active:bg-white/10 active:text-rose-300"
                  aria-label={`${p.name}を削除`}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              )}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {p.hasLifeCounter ?? true ? `開始ライフ ${p.startingLife} / ` : ''}
              既定 {p.playerCountDefault}人
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
        <button
          onClick={() => setShowAddProfile(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-3 text-sm font-medium text-slate-300 transition-transform active:scale-[0.98] active:bg-white/10"
        >
          <Plus size={16} strokeWidth={2} />
          ゲームを追加
        </button>
      </div>

      <Sheet open={showAddProfile} title="ゲームを追加" onClose={() => setShowAddProfile(false)}>
        <GameProfileForm
          onCancel={() => setShowAddProfile(false)}
          onCreated={(created) => {
            setShowAddProfile(false)
            setManageProfileId(created.id)
          }}
        />
      </Sheet>

      <div className="mt-6">
        <SectionHeading icon={Image}>ホーム画面の壁紙</SectionHeading>
        <WallpaperSection
          id={HOME_WALLPAPER_ID}
          title="「対戦」タブ最初の『ゲームを選ぶ』画面の壁紙"
          description="任意の画像をこの端末に保存して、ゲームを選ぶ画面全体の背景にできます。文字が読みやすいよう自動で暗幕をかけ、縦長の画像は上側（顔まわり）を優先して切り抜きます。画像はこの端末だけに保存され、バックアップの書き出しには含まれません。"
        />
      </div>

      <div className="mt-6">
        <SectionHeading icon={SlidersHorizontal}>表示のカスタマイズ</SectionHeading>
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
        <SectionHeading icon={BatteryCharging}>画面・電池</SectionHeading>
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

        {FULLSCREEN_SUPPORTED ? (
          <>
            <div className="mt-2">
              <PrefToggle
                label="対戦中はブラウザの表示を隠す（全画面表示）"
                checked={prefs.fullscreenOnPlay}
                onChange={(v) => setBoolPref('fullscreenOnPlay', v)}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              対面プレイでは相手側のボタンが画面の上端に来るため、ブラウザの上部バーへの誤タップが起きがちです。
              ONにするとゲームを選んだ瞬間に全画面表示になり、上部バーが消えます。
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            この端末・ブラウザは全画面表示に対応していません。
          </p>
        )}
      </div>

      <div className="mt-6">
        <SectionHeading icon={Layers}>デッキ・タグ・プレイヤーの整理</SectionHeading>
        <p className="mb-2 text-xs text-slate-500">
          「対戦を記録する」画面と同じチップです。右上の「編集」で、ドラッグ並び替え・タップで改名・✕で削除ができます。
        </p>
        <div className="relative mb-3">
          <select
            value={manageProfileId ?? ''}
            onChange={(e) => setManageProfileId(e.target.value || null)}
            className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
          >
            <option value="">ゲームを選択...</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
        </div>

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
