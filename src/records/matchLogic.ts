import type { GameRecord, Match } from '../db/types'

// BO1/EDH-pod=1本先取、BO3=2本先取、BO5=3本先取。
export function requiredWins(format?: Match['format']): number {
  if (format === 'BO3') return 2
  if (format === 'BO5') return 3
  return 1
}

export interface Tally {
  me: number
  opponent: number
  draw: number
}

export function tally(records: GameRecord[]): Tally {
  const t: Tally = { me: 0, opponent: 0, draw: 0 }
  for (const r of records) {
    if (r.result === 'win') t.me++
    else if (r.result === 'lose') t.opponent++
    else if (r.result === 'draw') t.draw++
  }
  return t
}
