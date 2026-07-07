import type { GameRecord, Match } from '../db/types'

export interface WinLossDraw {
  wins: number
  losses: number
  draws: number
  total: number
  winRate: number
}

function summarize(results: Array<'win' | 'lose' | 'draw'>): WinLossDraw {
  const wins = results.filter((r) => r === 'win').length
  const losses = results.filter((r) => r === 'lose').length
  const draws = results.filter((r) => r === 'draw').length
  const total = results.length
  return { wins, losses, draws, total, winRate: total > 0 ? wins / total : 0 }
}

// 全体勝率（マッチ単位）
export function overallStats(matches: Match[]): WinLossDraw {
  return summarize(matches.map((m) => m.result))
}

export interface DeckStat extends WinLossDraw {
  deckId: string
  deckName: string
}

// 対面デッキ別勝率。EDH等でopponentDeckIdsが複数の場合は両方にカウントする。
export function statsByOpponentDeck(matches: Match[], deckNameMap: Record<string, string>): DeckStat[] {
  const byDeck = new Map<string, Match['result'][]>()
  for (const m of matches) {
    const ids = m.opponentDeckIds.length > 0 ? m.opponentDeckIds : ['__unknown__']
    for (const id of ids) {
      if (!byDeck.has(id)) byDeck.set(id, [])
      byDeck.get(id)!.push(m.result)
    }
  }
  const out: DeckStat[] = []
  for (const [deckId, results] of byDeck) {
    out.push({
      deckId,
      deckName: deckId === '__unknown__' ? '（未設定）' : (deckNameMap[deckId] ?? '？'),
      ...summarize(results),
    })
  }
  return out.sort((a, b) => b.total - a.total)
}

// 自分デッキ別勝率（マッチ単位）
export function statsByMyDeck(matches: Match[], deckNameMap: Record<string, string>): DeckStat[] {
  const byDeck = new Map<string, Match['result'][]>()
  for (const m of matches) {
    const id = m.myDeckId ?? '__unknown__'
    if (!byDeck.has(id)) byDeck.set(id, [])
    byDeck.get(id)!.push(m.result)
  }
  const out: DeckStat[] = []
  for (const [deckId, results] of byDeck) {
    out.push({
      deckId,
      deckName: deckId === '__unknown__' ? '（未設定）' : (deckNameMap[deckId] ?? '？'),
      ...summarize(results),
    })
  }
  return out.sort((a, b) => b.total - a.total)
}

// 先手/後手別勝率（ゲーム単位）
export function statsByOnThePlay(games: GameRecord[]): { onPlay: WinLossDraw; onDraw: WinLossDraw } {
  const onPlay = games.filter((g) => g.onThePlay === 'me' && g.result)
  const onDraw = games.filter((g) => g.onThePlay === 'opponent' && g.result)
  return {
    onPlay: summarize(onPlay.map((g) => g.result!)),
    onDraw: summarize(onDraw.map((g) => g.result!)),
  }
}

export interface MulliganBucket extends WinLossDraw {
  mulligans: number
}

// マリガン数(自分)と勝敗の相関（ゲーム単位）
export function statsByMulligan(games: GameRecord[]): MulliganBucket[] {
  const byCount = new Map<number, Match['result'][]>()
  for (const g of games) {
    if (!g.result) continue
    const n = g.mulligans.me
    if (!byCount.has(n)) byCount.set(n, [])
    byCount.get(n)!.push(g.result)
  }
  const out: MulliganBucket[] = []
  for (const [mulligans, results] of byCount) {
    out.push({ mulligans, ...summarize(results) })
  }
  return out.sort((a, b) => a.mulligans - b.mulligans)
}

export interface TrendPoint {
  matchIndex: number
  date: string
  cumulativeWinRate: number
}

// 期間推移：時系列(古い順)に直して累積勝率を出す
export function winRateTrend(matches: Match[]): TrendPoint[] {
  const chronological = [...matches].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  )
  let wins = 0
  return chronological.map((m, i) => {
    if (m.result === 'win') wins++
    return { matchIndex: i + 1, date: m.date, cumulativeWinRate: wins / (i + 1) }
  })
}
