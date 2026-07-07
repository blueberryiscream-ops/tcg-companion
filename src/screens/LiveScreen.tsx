import { useEffect, useState } from 'react'
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

type ToolKey = 'coin' | 'dice' | 'mulligan' | 'playdraw' | null

// 進行中のマッチ（記録に接続済み）。BO3等は複数ゲームぶんここで数える。
interface MatchSession {
  matchId: string
  format: Match['format']
  gameIndex: number
  wins: { me: number; opponent: number; draw: number }
}

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
}: {
  profiles: GameProfile[]
  selectedProfileId: string | null
  onSelectProfile: (id: string) => void
}) {
  const profile = profiles.find((p) => p.id === selectedProfileId) ?? null
  const { prefs } = useUiPrefs()

  // 1v1 か 多人数か。プロファイルの既定人数から初期値を決める。
  const [multi, setMulti] = useState(false)
  useEffect(() => {
    setMulti((profile?.playerCountDefault ?? 2) > 2)
  }, [profile?.id, profile?.playerCountDefault])

  const playerCount = multi ? (profile?.playerCountDefault ?? 4) : 2

  const {
    board,
    canUndo,
    changeLife,
    setLife,
    addCommanderDamage,
    changeMulligan,
    undo,
    reset,
  } = useBoard(profile, playerCount)

  const [tool, setTool] = useState<ToolKey>(null)
  const [onThePlay, setOnThePlay] = useState<'me' | 'opponent' | null>(null)

  // 各カウンターの向き（true=180度反転）。キーはプレイヤーの並び順(index)。
  // 既定は「相手側(後半)だけ反転」＝対面。人数やゲームが変わったら既定に戻す。
  const [flips, setFlips] = useState<Record<number, boolean>>({})
  useEffect(() => {
    setFlips({})
  }, [profile?.id, multi])

  // ライブ→記録連携（フェーズ2）
  const [matchSession, setMatchSession] = useState<MatchSession | null>(null)
  const [recordStep, setRecordStep] = useState<'setup' | 'result' | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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

  // プロファイル未選択：まず選んでもらう。
  if (!profile) {
    return (
      <div className="p-4">
        <h1 className="mb-1 text-2xl font-bold">対戦</h1>
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
        hideName={prefs.compactLiveScreen}
        flipped={flipped}
        onToggleFlip={() => setFlips((f) => ({ ...f, [index]: !(f[index] ?? defaultFlipped) }))}
        onChangeLife={(delta) => changeLife(p.id, delta)}
        onSetLife={(v) => setLife(p.id, v)}
        onCommanderDamage={(sourceId, delta) => addCommanderDamage(p.id, sourceId, delta)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* 相手側（上）：ライフカウンターだけ。各パネルは⇅で向きを反転できる（既定は相手向き）。 */}
      <div className="min-h-0 flex-1">
        <SideRow count={opponentSidePlayers.length}>
          {opponentSidePlayers.map((p, i) => renderLifeCounter(p, half + i))}
        </SideRow>
      </div>

      {/* 中央の共有ツール：コイン/ダイス/マリガン/先後。相手も触れるよう真ん中に置く。 */}
      <div className="grid shrink-0 grid-cols-4 gap-2">
        <ToolButton icon="🪙" label="コイン" compact={prefs.compactLiveScreen} onClick={() => setTool('coin')} />
        <ToolButton icon="🎲" label="ダイス" compact={prefs.compactLiveScreen} onClick={() => setTool('dice')} />
        <ToolButton
          icon="🔄"
          label={`マリガン 自${board.mulligans.me}/相${board.mulligans.opponent}`}
          badge={board.mulligans.me}
          badgeOpponent={board.mulligans.opponent}
          compact={prefs.compactLiveScreen}
          onClick={() => setTool('mulligan')}
        />
        <ToolButton icon="🥇" label="先後" compact={prefs.compactLiveScreen} onClick={() => setTool('playdraw')} />
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
          className="rounded-xl bg-sky-600 py-3 text-base font-bold text-white active:bg-sky-500"
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
