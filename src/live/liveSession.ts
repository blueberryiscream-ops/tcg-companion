import type { Board } from './useBoard'
import type { Match } from '../db/types'

// 記録連携中のマッチ（BO3等は複数ゲームぶんここで数える）。LiveScreenと共有する型。
export interface MatchSession {
  matchId: string
  format: Match['format']
  gameIndex: number
  wins: { me: number; opponent: number; draw: number }
}

export interface LiveSessionSnapshot {
  profileId: string
  multi: boolean
  board: Board
  matchSession: MatchSession | null
  onThePlay: 'me' | 'opponent' | null
}

const STORAGE_KEY = 'tcg-companion:live-session'

// スマホでアプリを切り替えたりホーム画面のショートカットから戻ったりすると、
// OS/ブラウザがメモリ節約のためページを裏で作り直すことがある。そうなってもライフ等の
// 対戦中の数字が消えないよう、変更のたびにこの内容を端末（localStorage）に保存しておく。
export function loadLiveSession(): LiveSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LiveSessionSnapshot
  } catch {
    return null
  }
}

export function saveLiveSession(snapshot: LiveSessionSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // 容量超過等は致命的ではないので無視する
  }
}

export function clearLiveSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
