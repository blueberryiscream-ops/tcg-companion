import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProfile, LifeEvent } from '../db/types'
import { newId, nowIso } from '../lib/id'

// ライブ画面の「盤面」1ゲームぶんの状態。
export interface PlayerState {
  id: string
  name: string
  life: number
  // EDH: 各対戦相手（playerId）から受けた統率者ダメージ
  commanderDamage: Record<string, number>
}

export interface Board {
  players: PlayerState[]
  mulligans: { me: number; opponent: number }
  lifeLog: LifeEvent[]
}

function makePlayers(count: number, startingLife: number): PlayerState[] {
  const arr: PlayerState[] = []
  for (let i = 0; i < count; i++) {
    arr.push({
      id: newId(),
      name: i === 0 ? 'あなた' : count === 2 ? '相手' : `P${i + 1}`,
      life: startingLife,
      commanderDamage: {},
    })
  }
  return arr
}

function freshBoard(count: number, startingLife: number): Board {
  return {
    players: makePlayers(count, startingLife),
    mulligans: { me: 0, opponent: 0 },
    lifeLog: [],
  }
}

// 盤面 + Undo（直前操作を戻す）。DESIGN.md フェーズ1。
// restored: スマホでアプリが裏で再読み込みされた後などに、直前の対戦を復元するための情報（任意）。
// profileIdはselectedProfileId由来の確実な値（profilesの非同期読み込みを待たなくてよい）。
export function useBoard(
  profile: GameProfile | null,
  playerCount: number,
  restored?: { profileId: string; board: Board } | null,
) {
  const startingLife = profile?.startingLife ?? 20

  const [board, setBoard] = useState<Board>(
    () => restored?.board ?? freshBoard(playerCount, startingLife),
  )
  const [undoStack, setUndoStack] = useState<Board[]>([])

  // プロファイルや人数が「実際に変わったとき」だけ新しいゲームとして作り直す。
  // 注意: profilesの読み込みが非同期のため、マウント直後は一瞬 profile が null になる
  // （selectedProfileIdは復元済みでも profiles 配列がまだ空）。この間にキーが変化したと
  // 誤判定してリセットしないよう、基準点は「復元データがあればそのキー、無ければnull」から
  // 始める（profile.idを使わない＝読み込みタイミングに左右されない）。
  const sessionKey = profile ? `${profile.id}:${playerCount}` : null
  const prevSessionKey = useRef<string | null>(
    restored ? `${restored.profileId}:${playerCount}` : null,
  )
  useEffect(() => {
    if (sessionKey === null) return
    if (prevSessionKey.current === sessionKey) return
    prevSessionKey.current = sessionKey
    setBoard(freshBoard(playerCount, startingLife))
    setUndoStack([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, playerCount, startingLife])

  // 盤面を書き換える共通口。書き換え前を Undo スタックに積む。
  function mutate(recipe: (draft: Board) => void) {
    setBoard((prev) => {
      const next: Board = structuredClone(prev)
      recipe(next)
      setUndoStack((s) => [...s, prev].slice(-50)) // 直近50手ぶん
      return next
    })
  }

  // ライフを delta だけ変える（統率者ダメージ等の理由も記録）。
  function changeLife(playerId: string, delta: number, reason?: string) {
    if (delta === 0) return
    mutate((b) => {
      const p = b.players.find((x) => x.id === playerId)
      if (!p) return
      const from = p.life
      const to = from + delta
      p.life = to
      b.lifeLog.push({ t: nowIso(), player: p.name, from, to, reason })
    })
  }

  // ライフを直接この値にする（手入力用）。
  function setLife(playerId: string, value: number) {
    mutate((b) => {
      const p = b.players.find((x) => x.id === playerId)
      if (!p) return
      const from = p.life
      p.life = value
      b.lifeLog.push({ t: nowIso(), player: p.name, from, to: value, reason: '手入力' })
    })
  }

  // 統率者ダメージを加える。ライフも同時に減る（MTGの挙動）。
  function addCommanderDamage(targetId: string, sourceId: string, delta: number) {
    if (delta === 0) return
    mutate((b) => {
      const p = b.players.find((x) => x.id === targetId)
      const src = b.players.find((x) => x.id === sourceId)
      if (!p) return
      const cur = p.commanderDamage[sourceId] ?? 0
      const nextVal = Math.max(0, cur + delta)
      const applied = nextVal - cur
      p.commanderDamage[sourceId] = nextVal
      if (applied !== 0) {
        const from = p.life
        p.life = from - applied
        b.lifeLog.push({
          t: nowIso(),
          player: p.name,
          from,
          to: p.life,
          reason: `統率者ダメージ(${src?.name ?? '相手'})`,
        })
      }
    })
  }

  function changeMulligan(who: 'me' | 'opponent', delta: number) {
    mutate((b) => {
      b.mulligans[who] = Math.max(0, b.mulligans[who] + delta)
    })
  }

  function undo() {
    setUndoStack((s) => {
      if (s.length === 0) return s
      const prev = s[s.length - 1]
      setBoard(prev)
      return s.slice(0, -1)
    })
  }

  function reset() {
    setBoard(freshBoard(playerCount, startingLife))
    setUndoStack([])
  }

  const canUndo = undoStack.length > 0

  return useMemo(
    () => ({
      board,
      canUndo,
      changeLife,
      setLife,
      addCommanderDamage,
      changeMulligan,
      undo,
      reset,
    }),
    // board と canUndo が変われば新しいオブジェクトを返す
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, canUndo],
  )
}
