import { db } from './db'
import { newId } from '../lib/id'
import { clearWallpaper } from './wallpaper'
import type { GameProfile, CounterType, DieType } from './types'

// ===== ユーザー追加のゲームプロファイル =====
// 内蔵プロファイル（isBuiltIn: true）は起動時に毎回シードし直されるため編集・削除できない。
// ここで扱うのはユーザーが「ゲームを追加」で作った分だけ。

export interface CreateGameProfileInput {
  name: string
  hasLifeCounter: boolean
  startingLife: number
  playerCountDefault: number
  supportsCommanderDamage: boolean
  counterTypes: CounterType[]
  diceDefaults: DieType[]
  accentColor: string
}

export async function createGameProfile(input: CreateGameProfileInput): Promise<GameProfile> {
  const profile: GameProfile = {
    id: newId(),
    isBuiltIn: false,
    ...input,
  }
  await db.profiles.put(profile)
  return profile
}

// プロファイルとそれに紐づく全データ（デッキ・タグ・プレイヤー・対戦記録・壁紙）を削除する。
// 統括承認済みの方針：確認ダイアログで警告した上で完全に削除し、復元したい場合は
// バックアップの読み込みに任せる（＝ここでの削除に「取り消し」機能は持たせない）。
export async function deleteGameProfile(gameProfileId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.profiles, db.decks, db.matches, db.gameRecords, db.tags, db.players],
    async () => {
      const matches = await db.matches.where('gameProfileId').equals(gameProfileId).toArray()
      const matchIds = matches.map((m) => m.id)
      if (matchIds.length > 0) {
        await db.gameRecords.where('matchId').anyOf(matchIds).delete()
      }
      await db.matches.where('gameProfileId').equals(gameProfileId).delete()
      await db.decks.where('gameProfileId').equals(gameProfileId).delete()
      await db.tags.where('gameProfileId').equals(gameProfileId).delete()
      await db.players.where('gameProfileId').equals(gameProfileId).delete()
      await db.profiles.delete(gameProfileId)
    },
  )
  await clearWallpaper(gameProfileId)
}
