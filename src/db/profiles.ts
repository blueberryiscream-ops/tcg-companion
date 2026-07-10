import { db } from './db'
import { newId } from '../lib/id'
import { clearWallpaper } from './wallpaper'
import { getBuiltInProfile } from './seed'
import type { GameProfile, CounterType, DieType } from './types'

// ===== ゲームプロファイルの追加・編集・削除 =====
// 内蔵プロファイル（isBuiltIn: true）も編集できる（DESIGN.md §12-1）。
// 起動時のシードは「まだ無いidだけ挿入」に変えてあるため、編集内容が上書きされることはない。
// ただし削除だけは内蔵プロファイルに対して行わない（「初期設定に戻す」で代替する）。

export interface GameProfileInput {
  name: string
  hasLifeCounter: boolean
  startingLife: number
  playerCountDefault: number
  supportsCommanderDamage: boolean
  counterTypes: CounterType[]
  diceDefaults: DieType[]
  accentColor: string
}

// 旧名。既存の呼び出し箇所との互換のために残す。
export type CreateGameProfileInput = GameProfileInput

export async function createGameProfile(input: GameProfileInput): Promise<GameProfile> {
  const profile: GameProfile = {
    id: newId(),
    isBuiltIn: false,
    ...input,
  }
  await db.profiles.put(profile)
  return profile
}

// 既存プロファイルの中身を書き換える。id と isBuiltIn は変えない。
// 削除→作り直しだと対戦記録まで消えてしまうため、名前や色を直したいだけの人はこちらを使う。
export async function updateGameProfile(id: string, input: GameProfileInput): Promise<void> {
  await db.profiles.update(id, { ...input })
}

// 内蔵プロファイルを出荷時の定義に戻す（対戦記録・デッキ等のデータには触れない）。
export async function resetBuiltInProfile(id: string): Promise<GameProfile | null> {
  const original = getBuiltInProfile(id)
  if (!original) return null
  await db.profiles.put({ ...original })
  return original
}

// 削除の確認ダイアログで「何が何件消えるのか」を実数で見せるための集計。
export interface ProfileDataCounts {
  matches: number
  gameRecords: number
  decks: number
  tags: number
  players: number
}

export async function countProfileData(gameProfileId: string): Promise<ProfileDataCounts> {
  const matchIds = (await db.matches.where('gameProfileId').equals(gameProfileId).toArray()).map(
    (m) => m.id,
  )
  const [gameRecords, decks, tags, players] = await Promise.all([
    matchIds.length > 0 ? db.gameRecords.where('matchId').anyOf(matchIds).count() : 0,
    db.decks.where('gameProfileId').equals(gameProfileId).count(),
    db.tags.where('gameProfileId').equals(gameProfileId).count(),
    db.players.where('gameProfileId').equals(gameProfileId).count(),
  ])
  return { matches: matchIds.length, gameRecords, decks, tags, players }
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
