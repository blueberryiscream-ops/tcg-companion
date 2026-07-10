import { db } from './db'
import { nowIso } from '../lib/id'
import { recordBackupNow } from '../lib/backupReminder'
import type { GameProfile, Deck, Match, GameRecord, TagItem, PlayerItem } from './types'

// ===== バックアップ（全データのJSON書き出し/読み込み） =====
// DESIGN.md の「SyncAdapter」に相当：今はローカルファイル経由だけだが、
// 後日Firebase等を差し込むときもこの2関数のシグネチャは変えずに済む想定。

const BACKUP_VERSION = 1

interface BackupData {
  version: number
  exportedAt: string
  profiles: GameProfile[] // ユーザー追加分のみ（内蔵プロファイルは起動時に自動投入されるため含めない）
  decks: Deck[]
  matches: Match[]
  gameRecords: GameRecord[]
  tags: TagItem[]
  players: PlayerItem[]
}

async function buildBackupData(): Promise<BackupData> {
  const [allProfiles, decks, matches, gameRecords, tags, players] = await Promise.all([
    db.profiles.toArray(),
    db.decks.toArray(),
    db.matches.toArray(),
    db.gameRecords.toArray(),
    db.tags.toArray(),
    db.players.toArray(),
  ])
  return {
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    profiles: allProfiles.filter((p) => !p.isBuiltIn),
    decks,
    matches,
    gameRecords,
    tags,
    players,
  }
}

// 全データをJSONファイルとしてダウンロードする。
export async function exportBackup(): Promise<void> {
  const data = await buildBackupData()
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const today = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `tcg-companion-backup-${today}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  recordBackupNow()
}

export interface ImportResult {
  ok: boolean
  message: string
}

// バックアップJSONファイルを読み込み、各テーブルに反映する（同じidは上書き、新規は追加）。
export async function importBackup(file: File): Promise<ImportResult> {
  const text = await file.text()
  let data: Partial<BackupData>
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, message: 'ファイルを読み込めませんでした（JSON形式ではないようです）' }
  }
  if (!data || typeof data.version !== 'number') {
    return { ok: false, message: 'バックアップファイルの形式が正しくありません' }
  }

  await db.transaction(
    'rw',
    [db.profiles, db.decks, db.matches, db.gameRecords, db.tags, db.players],
    async () => {
      if (data.profiles?.length) await db.profiles.bulkPut(data.profiles)
      if (data.decks?.length) await db.decks.bulkPut(data.decks)
      if (data.matches?.length) await db.matches.bulkPut(data.matches)
      if (data.gameRecords?.length) await db.gameRecords.bulkPut(data.gameRecords)
      if (data.tags?.length) await db.tags.bulkPut(data.tags)
      if (data.players?.length) await db.players.bulkPut(data.players)
    },
  )

  const count =
    (data.matches?.length ?? 0) +
    (data.decks?.length ?? 0) +
    (data.tags?.length ?? 0) +
    (data.players?.length ?? 0)
  return { ok: true, message: `読み込みました（対戦${data.matches?.length ?? 0}件ほか、合計${count}件）` }
}
