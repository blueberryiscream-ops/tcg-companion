import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { GameProfile, Match } from '../db/types'
import { useBoard } from '../live/useBoard'
import { LifeCounter } from '../live/LifeCounter'
import { Sheet } from '../components/Sheet'
import { CoinToss } from '../live/CoinToss'
import { DiceRoller } from '../live/DiceRoller'
import { MulliganTracker } from '../live/MulliganTracker'
import { PlayDrawFlow } from '../live/PlayDrawFlow'
import { MatchSetupForm, type MatchSetupResult } from '../records/MatchSetupForm'
import { GameResultForm } from '../records/GameResultForm'
import { createMatch, addGameRecord, updateMatchResult } from '../db/repo'
import { requiredWins } from '../records/matchLogic'
import { useUiPrefs } from '../lib/uiPrefs'
import { useWallpaperUrl } from '../live/useWallpaperUrl'
import { HOME_WALLPAPER_ID } from '../db/wallpaper'
import { useWakeLock } from '../lib/useWakeLock'
import { DEFAULT_ACCENT, hexToRgba } from '../lib/color'
import {
  loadLiveSession,
  saveLiveSession,
  clearLiveSession,
  type MatchSession,
} from '../live/liveSession'

type ToolKey = 'coin' | 'dice' | 'mulligan' | 'playdraw' | null

// 対面プレイ用：画面の片側（上段/下段）に並ぶプレイヤーの列。
// 2人なら1枚、4人なら2枚を横並びにする。グリッドにすることで、
// 1人でも横幅いっぱいに広がって中央に収まる（左寄りにならない）。
function SideRow({ children, count }: { children: ReactNode; count: number }) {
  return (
    <div
      className={
        'grid h-full w-full min-h-0 gap-2 ' + (count > 1 ? 'grid-cols-2' : 'grid-cols-1')
      }
    >
      {children}
    </div>
  )
}

export function LiveScreen({
  profiles,
  selectedProfileId,
  onSelectProfile,
  isActiveTab,
}: {
  profiles: GameProfile[]
  selectedProfileId: string | null
  onSelectProfile: (id: string) => void
  isActiveTab: boolean
}) {
  const profile = profiles.find((p) => p.id === selectedProfileId) ?? null
  const { prefs } = useUiPrefs()

  // Wake Lock（DESIGN.md §8-2）: 設定でONにしていて、かつ実際にこのタブを見ているときだけ画面消灯を防ぐ。
  useWakeLock(prefs.wakeLockEnabled && isActiveTab)

  // 端末に保存された「対戦の続き」。スマホでアプリを切り替えた後などにページが作り直されても、
  // ライフ等が消えないようにするための復元用データ（一度だけ読む）。
  const [initialSession] = useState(() => loadLiveSession())
  const restoredSession =
    initialSession && initialSession.profileId === selectedProfileId ? initialSession : null

  // 1v1 か 多人数か。プロファイルの既定人数から初期値を決める（復元できるならその値を優先）。
  const [multi, setMulti] = useState(() =>
    restoredSession ? restoredSession.multi : (profile?.playerCountDefault ?? 2) > 2,
  )
  // プロファイルが「実際に変わったとき」だけ既定値へ戻す。
  // 注意: profilesの読み込みが非同期のため、マウント直後は一瞬 profile が null になる
  // （selectedProfileIdは復元済みでもprofiles配列がまだ空）。この間に「変わった」と
  // 誤判定しないよう、基準点は「復元データがあればそのID、無ければnull」から始める
  // （profile.idを使わない＝読み込みタイミングに左右されない）。
  const prevProfileIdForMulti = useRef<string | null>(restoredSession?.profileId ?? null)
  useEffect(() => {
    if (!profile) return
    if (prevProfileIdForMulti.current === profile.id) return
    prevProfileIdForMulti.current = profile.id
    setMulti((profile.playerCountDefault ?? 2) > 2)
  }, [profile?.id, profile?.playerCountDefault])

  const playerCount = multi ? (profile?.playerCountDefault ?? 4) : 2
  // 多人数(EDH等)は画面が狭く文字がごちゃつきやすいので、設定に関わらず常にアイコンのみ表示にする。
  const effectiveCompactUI = prefs.compactLiveScreen || multi

  // ホーム画面（「ゲームを選ぶ」一覧）専用の壁紙。ゲーム別壁紙とは別枠で1枚だけ設定できる。
  const homeWallpaperUrl = useWallpaperUrl(HOME_WALLPAPER_ID)
  const homeBgStyle = homeWallpaperUrl
    ? {
        backgroundImage: `linear-gradient(${hexToRgba('#0b0f17', 0.55)}, ${hexToRgba('#0b0f17', 0.55)}), url(${homeWallpaperUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }
    : undefined

  // ゲーム別背景（DESIGN.md §8-1）: 壁紙が設定されていればそれ＋暗幕、無ければアクセント色の淡いグラデ。
  const wallpaperUrl = useWallpaperUrl(profile?.id ?? null)
  const accentColor = profile?.accentColor ?? DEFAULT_ACCENT
  // 多人数(EDH)/文字を減らす設定のときは数字の可読性を最優先し、暗幕を濃くして壁紙を抑える。
  const scrimAlpha = effectiveCompactUI ? 0.9 : 0.68
  const liveBgStyle = wallpaperUrl
    ? {
        backgroundImage: `linear-gradient(${hexToRgba('#0b0f17', scrimAlpha)}, ${hexToRgba('#0b0f17', scrimAlpha)}), url(${wallpaperUrl})`,
        backgroundSize: 'cover',
        // 縦長の人物イラストで顔が切れないよう、中央ではなく上寄りを基準に切り抜く。
        backgroundPosition: 'center top',
      }
    : {
        backgroundImage: `radial-gradient(140% 90% at 50% -10%, ${hexToRgba(accentColor, 0.16)}, transparent 60%)`,
      }

  const {
    board,
    canUndo,
    changeLife,
    setLife,
    addCommanderDamage,
    changeMulligan,
    undo,
    reset,
  } = useBoard(
    profile,
    playerCount,
    restoredSession ? { profileId: restoredSession.profileId, board: restoredSession.board } : null,
  )

  const [tool, setTool] = useState<ToolKey>(null)
  const [onThePlay, setOnThePlay] = useState<'me' | 'opponent' | null>(
    () => restoredSession?.onThePlay ?? null,
  )

  // 各カウンターの向き（true=180度反転）。キーはプレイヤーの並び順(index)。
  // 既定は「相手側(後半)だけ反転」＝対面。人数やゲームが変わったら既定に戻す。
  const [flips, setFlips] = useState<Record<number, boolean>>({})
  useEffect(() => {
    setFlips({})
  }, [profile?.id, multi])

  // ライブ→記録連携（フェーズ2）
  const [matchSession, setMatchSession] = useState<MatchSession | null>(
    () => restoredSession?.matchSession ?? null,
  )
  const [recordStep, setRecordStep] = useState<'setup' | 'result' | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 対戦の続きを端末に保存する。スマホでアプリを切り替えたりOSにページを作り直されたりしても、
  // ライフ・マリガン・記録中のマッチなどが消えないようにするため（変更のたびに上書き保存）。
  useEffect(() => {
    if (!profile) {
      // プロファイル一覧がまだ読み込み中の一瞬もここを通るので、読み込み済みで
      // 本当に該当なし（＝ユーザーがゲームを選び直した）のときだけ消す。
      if (profiles.length > 0) clearLiveSession()
      return
    }
    saveLiveSession({ profileId: profile.id, multi, board, matchSession, onThePlay })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profiles.length, multi, board, matchSession, onThePlay])

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  function openRecordFlow() {
    setRecordStep(matchSession ? 'result' : 'setup')
  }

  async function handleMatchSetupSubmit(input: MatchSetupResult) {
    if (!profile) return
    const match = await createMatch({ gameProfileId: profile.id, ...input })
    setMatchSession({
      matchId: match.id,
      format: input.format,
      gameIndex: 1,
      wins: { me: 0, opponent: 0, draw: 0 },
    })
    setRecordStep('result')
  }

  async function handleGameResult(result: 'win' | 'lose' | 'draw') {
    if (!matchSession) return
    await addGameRecord({
      matchId: matchSession.matchId,
      gameIndex: matchSession.gameIndex,
      onThePlay: onThePlay ?? undefined,
      mulligans: { me: board.mulligans.me, opponent: board.mulligans.opponent },
      result,
      lifeLog: board.lifeLog,
      finalLife: board.players.map((p) => ({ name: p.name, life: p.life })),
    })

    const wins = { ...matchSession.wins }
    if (result === 'win') wins.me++
    else if (result === 'lose') wins.opponent++
    else wins.draw++

    const need = requiredWins(matchSession.format)
    const final: Match['result'] | null =
      wins.me >= need ? 'win' : wins.opponent >= need ? 'lose' : null

    reset()
    setOnThePlay(null)
    setRecordStep(null)

    if (final) {
      await updateMatchResult(matchSession.matchId, final)
      setMatchSession(null)
      showToast('マッチを記録しました')
    } else {
      const finishedGameIndex = matchSession.gameIndex
      setMatchSession({ ...matchSession, gameIndex: finishedGameIndex + 1, wins })
      showToast(`第${finishedGameIndex}ゲームを保存。次のゲームへ`)
    }
  }

  async function finalizeMatchNow() {
    if (!matchSession) return
    const { me, opponent } = matchSession.wins
    const result: Match['result'] = me > opponent ? 'win' : opponent > me ? 'lose' : 'draw'
    await updateMatchResult(matchSession.matchId, result)
    setMatchSession(null)
    reset()
    setOnThePlay(null)
    showToast('マッチを終了しました')
  }

  // プロファイル未選択：まず選んでもらう。ホーム画面用の壁紙があればページ全体の背景に敷く。
  if (!profile) {
    return (
      <div className="h-full p-4" style={homeBgStyle}>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">対戦</h1>
        <p className="mb-4 text-sm text-slate-400">
          使うゲームを選んでください。あとから設定タブでも変えられます。
        </p>
        <div className="flex flex-col gap-3">
          {profiles.length === 0 && (
            <p className="text-slate-500">読み込み中…</p>
          )}
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectProfile(p.id)}
              className="rounded-xl bg-white/10 p-4 text-left active:bg-white/20"
            >
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="text-sm text-slate-400">
                開始ライフ {p.startingLife} / {p.playerCountDefault}人
                {p.supportsCommanderDamage && ' / 統率者ダメージ'}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 対面プレイ用に上下2列へ分ける。2人なら1人ずつ、4人なら2人ずつ。
  const half = Math.ceil(board.players.length / 2)
  const mySidePlayers = board.players.slice(0, half)
  const opponentSidePlayers = board.players.slice(half)
  // ネスト関数の中では profile の null 絞り込みが引き継がれないため、先に取り出しておく。
  const supportsCommanderDamage = profile.supportsCommanderDamage

  // index はプレイヤーの並び順。既定の向きは「後半(相手側)だけ反転」。
  function renderLifeCounter(p: (typeof board.players)[number], index: number) {
    const defaultFlipped = index >= half
    const flipped = flips[index] ?? defaultFlipped
    return (
      <LifeCounter
        key={p.id}
        player={p}
        others={board.players.filter((o) => o.id !== p.id)}
        supportsCommanderDamage={supportsCommanderDamage}
        compact={multi}
        hideName={effectiveCompactUI}
        flipped={flipped}
        onToggleFlip={() => setFlips((f) => ({ ...f, [index]: !(f[index] ?? defaultFlipped) }))}
        onChangeLife={(delta) => changeLife(p.id, delta)}
        onSetLife={(v) => setLife(p.id, v)}
        onCommanderDamage={(sourceId, delta) => addCommanderDamage(p.id, sourceId, delta)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2" style={liveBgStyle}>
      {/* 相手側（上）：ライフカウンターだけ。各パネルは⇅で向きを反転できる（既定は相手向き）。 */}
      <div className="min-h-0 flex-1">
        <SideRow count={opponentSidePlayers.length}>
          {opponentSidePlayers.map((p, i) => renderLifeCounter(p, half + i))}
        </SideRow>
      </div>

      {/* 中央の共有ツール：コイン/ダイス/マリガン/先後。相手も触れるよう真ん中に置く。 */}
      <div className="grid shrink-0 grid-cols-4 gap-2">
        <ToolButton icon="🪙" label="コイン" compact={effectiveCompactUI} onClick={() => setTool('coin')} />
        <ToolButton icon="🎲" label="ダイス" compact={effectiveCompactUI} onClick={() => setTool('dice')} />
        <ToolButton
          icon="🔄"
          label={`マリガン 自${board.mulligans.me}/相${board.mulligans.opponent}`}
          badge={board.mulligans.me}
          badgeOpponent={board.mulligans.opponent}
          compact={effectiveCompactUI}
          onClick={() => setTool('mulligan')}
        />
        <ToolButton icon="🥇" label="先後" compact={effectiveCompactUI} onClick={() => setTool('playdraw')} />
      </div>

      {/* 自分側（下）：ライフカウンター（既定は自分向き） */}
      <div className="min-h-0 flex-1">
        <SideRow count={mySidePlayers.length}>
          {mySidePlayers.map((p, i) => renderLifeCounter(p, i))}
        </SideRow>
      </div>

      {/* 操作エリア（試合の設定・記録＝自分側の画面下にまとめる） */}
      <div className="flex shrink-0 flex-col gap-2">
        {/* 先後の表示 */}
        {onThePlay && (
          <div className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-center text-sm text-violet-200">
            先攻: {onThePlay === 'me' ? 'あなた' : '相手'}
          </div>
        )}

        {/* 記録中のマッチの進行状況 */}
        {matchSession && (
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200">
            <span>
              記録中: {matchSession.format ?? 'BO1'}（{matchSession.wins.me}-
              {matchSession.wins.opponent}）・第{matchSession.gameIndex}ゲーム
            </span>
            <button
              onClick={finalizeMatchNow}
              className="rounded bg-white/10 px-2 py-0.5 text-xs active:bg-white/20"
            >
              終了
            </button>
          </div>
        )}

        {/* ユーティリティ：ゲーム選択・人数・Undo・新ゲーム */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectProfile('')}
            className="min-w-0 flex-1 truncate rounded-lg bg-white/10 px-2 py-2 text-left text-sm text-slate-300 active:bg-white/20"
            title="ゲームを選び直す"
          >
            {profile.name} ▾
          </button>
          <button
            onClick={() => setMulti((m) => !m)}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm active:bg-white/20"
          >
            {multi ? '多人数' : '1v1'}
          </button>
          <button
            onClick={undo}
            disabled={!canUndo}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold active:bg-white/20 disabled:opacity-40"
          >
            ↩ Undo
          </button>
          <button
            onClick={() => {
              const msg = matchSession
                ? 'ライフやカウンターを初期状態に戻します。記録中のマッチもキャンセルされますが良いですか？'
                : 'ライフやカウンターを初期状態に戻しますか？'
              if (window.confirm(msg)) {
                reset()
                setOnThePlay(null)
                setMatchSession(null)
              }
            }}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm active:bg-white/20"
          >
            新ゲーム
          </button>
        </div>

        {/* この対戦を記録する（フェーズ2の核） */}
        <button
          onClick={openRecordFlow}
          className="rounded-xl bg-[var(--accent)] py-3 text-base font-bold text-white active:opacity-80"
        >
          🏁 {matchSession ? 'このゲームの結果を記録する' : 'この対戦を記録する'}
        </button>
      </div>

      {/* 各道具のシート */}
      <Sheet open={tool === 'coin'} title="コイントス" onClose={() => setTool(null)}>
        <CoinToss />
      </Sheet>
      <Sheet open={tool === 'dice'} title="ダイスロール" onClose={() => setTool(null)}>
        <DiceRoller defaults={profile.diceDefaults} />
      </Sheet>
      <Sheet open={tool === 'mulligan'} title="マリガン" onClose={() => setTool(null)}>
        <MulliganTracker mulligans={board.mulligans} onChange={changeMulligan} />
      </Sheet>
      <Sheet open={tool === 'playdraw'} title="先後を決める" onClose={() => setTool(null)}>
        <PlayDrawFlow
          onDecided={(v) => {
            setOnThePlay(v)
            setTool(null)
          }}
        />
      </Sheet>

      {/* 記録フロー用シート */}
      <Sheet open={recordStep === 'setup'} title="対戦を記録" onClose={() => setRecordStep(null)}>
        <MatchSetupForm
          profile={profile}
          multi={multi}
          onCancel={() => setRecordStep(null)}
          onSubmit={handleMatchSetupSubmit}
        />
      </Sheet>
      <Sheet
        open={recordStep === 'result'}
        title={`第${matchSession?.gameIndex ?? 1}ゲームの結果`}
        onClose={() => setRecordStep(null)}
      >
        {matchSession && (
          <GameResultForm
            gameIndex={matchSession.gameIndex}
            format={matchSession.format}
            wins={matchSession.wins}
            onThePlay={onThePlay}
            mulligans={{ me: board.mulligans.me, opponent: board.mulligans.opponent }}
            players={board.players.map((p) => ({ name: p.name, life: p.life }))}
            onResult={handleGameResult}
          />
        )}
      </Sheet>

      {/* トースト（保存できたことを短く知らせる） */}
      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 rounded-xl bg-slate-800 px-4 py-3 text-center text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function ToolButton({
  icon,
  label,
  badge,
  badgeOpponent,
  compact,
  onClick,
}: {
  icon: string
  label: string
  badge?: number
  badgeOpponent?: number
  compact?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative flex flex-col items-center gap-1 rounded-xl bg-white/10 active:bg-white/25 ' +
        (compact ? 'py-3' : 'py-3.5')
      }
    >
      <span className="text-3xl leading-none">{icon}</span>
      {!compact && <span className="text-sm text-slate-300">{label}</span>}
      {compact && !!badge && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-xs font-bold text-white">
          {badge}
        </span>
      )}
      {compact && !!badgeOpponent && (
        <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
          {badgeOpponent}
        </span>
      )}
    </button>
  )
}
