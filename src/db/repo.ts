import { db } from './db'
import type { Deck, Match, GameRecord, TagItem, PlayerItem } from './types'
import { newId, nowIso } from '../lib/id'

// ===== デッキ =====
// order（表示順）が同じ/未設定な場合は名前順にフォールバックして安定させる。
export async function listDecks(gameProfileId: string, isMine: boolean): Promise<Deck[]> {
  const all = await db.decks.where('gameProfileId').equals(gameProfileId).toArray()
  return all
    .filter((d) => d.isMine === isMine)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
}

export async function createDeck(
  gameProfileId: string,
  name: string,
  isMine: boolean,
): Promise<Deck> {
  const existing = await listDecks(gameProfileId, isMine)
  const order = existing.length > 0 ? Math.max(...existing.map((d) => d.order ?? 0)) + 1 : 0
  const deck: Deck = { id: newId(), gameProfileId, name, isMine, order, createdAt: nowIso() }
  await db.decks.put(deck)
  return deck
}

export async function renameDeck(id: string, name: string): Promise<void> {
  await db.decks.update(id, { name })
}

export async function deleteDeck(id: string): Promise<void> {
  await db.decks.delete(id)
}

// ドラッグ並び替え後の新しい並び（idの配列）で order を振り直す。
export async function reorderDecks(orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => db.decks.update(id, { order: i })))
}

export async function getDeckNameMap(gameProfileId: string): Promise<Record<string, string>> {
  const decks = await db.decks.where('gameProfileId').equals(gameProfileId).toArray()
  const map: Record<string, string> = {}
  for (const d of decks) map[d.id] = d.name
  return map
}

// ===== タグ =====
// タグは名前(string)で Match に紐づくが、管理のため tags テーブルに実体を持つ。
export async function listTags(gameProfileId: string): Promise<TagItem[]> {
  const all = await db.tags.where('gameProfileId').equals(gameProfileId).toArray()
  return all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
}

// 表示順に並んだタグ名の配列（フェーズ2互換用）。
export async function listPastTags(gameProfileId: string): Promise<string[]> {
  return (await listTags(gameProfileId)).map((t) => t.name)
}

// タグを作る（同名が既にあればそれを返す＝重複させない）。デッキ作成と同じ即時作成の流儀。
export async function createTag(gameProfileId: string, name: string): Promise<TagItem> {
  const existing = await listTags(gameProfileId)
  const found = existing.find((t) => t.name === name)
  if (found) return found
  const order = existing.length > 0 ? Math.max(...existing.map((t) => t.order ?? 0)) + 1 : 0
  const tag: TagItem = { id: newId(), gameProfileId, name, order }
  await db.tags.add(tag)
  return tag
}

// 使われたタグ名を（無ければ）tags テーブルに登録する。マッチ作成時に呼ぶ。
export async function ensureTagsRegistered(gameProfileId: string, names: string[]): Promise<void> {
  for (const name of names) await createTag(gameProfileId, name)
}

// タグ改名：tags テーブルと、その名前を含む全マッチの tags 配列を更新する。
export async function renameTag(
  gameProfileId: string,
  tagId: string,
  newName: string,
): Promise<void> {
  const tag = await db.tags.get(tagId)
  if (!tag) return
  const oldName = tag.name
  if (oldName === newName) return
  await db.tags.update(tagId, { name: newName })
  const matches = await db.matches.where('gameProfileId').equals(gameProfileId).toArray()
  await Promise.all(
    matches
      .filter((m) => m.tags.includes(oldName))
      .map((m) =>
        db.matches.update(m.id, {
          tags: m.tags.map((t) => (t === oldName ? newName : t)),
        }),
      ),
  )
}

// タグ削除：tags テーブルから消し、全マッチの tags 配列からも取り除く。
export async function deleteTag(gameProfileId: string, tagId: string): Promise<void> {
  const tag = await db.tags.get(tagId)
  if (!tag) return
  await db.tags.delete(tagId)
  const matches = await db.matches.where('gameProfileId').equals(gameProfileId).toArray()
  await Promise.all(
    matches
      .filter((m) => m.tags.includes(tag.name))
      .map((m) => db.matches.update(m.id, { tags: m.tags.filter((t) => t !== tag.name) })),
  )
}

export async function reorderTags(orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => db.tags.update(id, { order: i })))
}

// ===== 対面プレイヤー =====
// タグと同じ流儀：名前(string)で Match に紐づくが、管理のため players テーブルに実体を持つ。
export async function listPlayers(gameProfileId: string): Promise<PlayerItem[]> {
  const all = await db.players.where('gameProfileId').equals(gameProfileId).toArray()
  return all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
}

export async function createPlayer(gameProfileId: string, name: string): Promise<PlayerItem> {
  const existing = await listPlayers(gameProfileId)
  const found = existing.find((p) => p.name === name)
  if (found) return found
  const order = existing.length > 0 ? Math.max(...existing.map((p) => p.order ?? 0)) + 1 : 0
  const player: PlayerItem = { id: newId(), gameProfileId, name, order }
  await db.players.add(player)
  return player
}

export async function renamePlayer(id: string, name: string): Promise<void> {
  await db.players.update(id, { name })
}

export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id)
}

export async function reorderPlayers(orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => db.players.update(id, { order: i })))
}

export async function getPlayerNameMap(gameProfileId: string): Promise<Record<string, string>> {
  const players = await db.players.where('gameProfileId').equals(gameProfileId).toArray()
  const map: Record<string, string> = {}
  for (const p of players) map[p.id] = p.name
  return map
}

// ===== マッチ / ゲーム記録 =====
export interface CreateMatchInput {
  gameProfileId: string
  date: string
  tags: string[]
  myDeckId?: string
  opponentDeckIds: string[]
  opponentPlayerIds: string[]
  format: Match['format']
  note: string
}

export async function createMatch(input: CreateMatchInput): Promise<Match> {
  const match: Match = {
    id: newId(),
    gameProfileId: input.gameProfileId,
    date: input.date,
    tags: input.tags,
    myDeckId: input.myDeckId,
    opponentDeckIds: input.opponentDeckIds,
    opponentPlayerIds: input.opponentPlayerIds,
    result: 'draw', // 決着するまでの仮値。ゲーム記録が積み上がるたびに更新する。
    format: input.format,
    note: input.note,
    createdAt: nowIso(),
  }
  await db.matches.put(match)
  await ensureTagsRegistered(input.gameProfileId, input.tags)
  return match
}

export interface AddGameRecordInput {
  matchId: string
  gameIndex: number
  onThePlay?: 'me' | 'opponent'
  mulligans: { me: number; opponent?: number }
  result: 'win' | 'lose' | 'draw'
  lifeLog?: GameRecord['lifeLog']
  finalLife?: GameRecord['finalLife']
}

export async function addGameRecord(input: AddGameRecordInput): Promise<GameRecord> {
  const rec: GameRecord = {
    id: newId(),
    matchId: input.matchId,
    gameIndex: input.gameIndex,
    onThePlay: input.onThePlay,
    mulligans: input.mulligans,
    result: input.result,
    lifeLog: input.lifeLog,
    finalLife: input.finalLife,
  }
  await db.gameRecords.put(rec)
  return rec
}

export async function updateMatchResult(matchId: string, result: Match['result']): Promise<void> {
  await db.matches.update(matchId, { result })
}

// 新しい順（同日ならcreatedAt順）。フェーズ3の分析はこれを絞り込んで使う。
export async function listAllMatches(gameProfileId: string): Promise<Match[]> {
  const all = await db.matches.where('gameProfileId').equals(gameProfileId).toArray()
  return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export async function listGameRecordsByMatchIds(matchIds: string[]): Promise<GameRecord[]> {
  if (matchIds.length === 0) return []
  return db.gameRecords.where('matchId').anyOf(matchIds).toArray()
}

// 直近のマッチ（連戦ボタン用：同じデッキ/タグ/フォーマットを再現する）
export async function getLastMatch(gameProfileId: string): Promise<Match | null> {
  const all = await listAllMatches(gameProfileId)
  return all[0] ?? null
}

// 全ゲーム合計の対戦数（未バックアップ促しの表示要否の判定に使う。プロファイルを問わない）。
export async function countAllMatches(): Promise<number> {
  return db.matches.count()
}
