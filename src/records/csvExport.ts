import type { GameRecord, Match } from '../db/types'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

const RESULT_LABEL: Record<string, string> = { win: '勝ち', lose: '負け', draw: '引き分け' }

// GameRecord単位（1ゲーム=1行）でCSVにする。スプレッドシートでのピボット分析向け。
export function buildGameRecordsCsv(
  matches: Match[],
  games: GameRecord[],
  deckNameMap: Record<string, string>,
  playerNameMap: Record<string, string> = {},
): string {
  const header = [
    '日付',
    'フォーマット',
    'タグ',
    '自分デッキ',
    '対面デッキ',
    '対面プレイヤー',
    'ゲーム',
    '先手/後手',
    'マリガン(自分)',
    'マリガン(相手)',
    'ライフ(終了時)',
    'ゲーム結果',
    'マッチ結果',
    '備考',
  ]
  const matchById = new Map(matches.map((m) => [m.id, m]))
  const rows: string[][] = []

  for (const g of games) {
    const m = matchById.get(g.matchId)
    if (!m) continue
    rows.push([
      m.date,
      m.format ?? '',
      m.tags.join('/'),
      m.myDeckId ? (deckNameMap[m.myDeckId] ?? '') : '',
      m.opponentDeckIds.map((id) => deckNameMap[id] ?? '?').join('/'),
      (m.opponentPlayerIds ?? []).map((id) => playerNameMap[id] ?? '?').join('/'),
      String(g.gameIndex),
      g.onThePlay === 'me' ? '先手' : g.onThePlay === 'opponent' ? '後手' : '',
      String(g.mulligans.me),
      String(g.mulligans.opponent ?? 0),
      g.finalLife ? g.finalLife.map((f) => `${f.name}:${f.life}`).join('/') : '',
      g.result ? RESULT_LABEL[g.result] : '',
      RESULT_LABEL[m.result],
      m.note,
    ])
  }

  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(','))
  // 先頭にBOMを付けてExcelでの文字化けを防ぐ（﻿を明示的に使う）
  return String.fromCharCode(0xfeff) + lines.join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
