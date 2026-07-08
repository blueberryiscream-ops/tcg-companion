// ===== データモデル（DESIGN.md §2 準拠） =====
// IndexedDB に保存する型の定義。ID は UUID 文字列、日時は ISO8601 文字列。

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'

export interface CounterType {
  key: string
  label: string
  defaultValue: number
  icon?: string
}

// ゲームのプリセット定義（内蔵 or ユーザー追加）
export interface GameProfile {
  id: string
  name: string
  startingLife: number
  playerCountDefault: number
  supportsCommanderDamage: boolean
  counterTypes: CounterType[]
  diceDefaults: DieType[]
  isBuiltIn: boolean
  accentColor?: string // '#rrggbb'。ゲーム別テーマの基準色（未設定は既定色にフォールバック）
}

// 自分のデッキ（対面デッキも同じ概念で候補サジェストに使う）
export interface Deck {
  id: string
  gameProfileId: string
  name: string
  isMine: boolean
  archetypeTag?: string
  order: number // 表示順（設定画面で並び替え可能）
  createdAt: string
}

// タグ（大会名・フォーマット等）。Match には名前(string)で紐づくが、
// 並び替え・改名・削除を可能にするため、名前と表示順を持つ実体としても管理する。
export interface TagItem {
  id: string
  gameProfileId: string
  name: string
  order: number
}

// 対面プレイヤー（対戦相手の名前・ニックネーム）。デッキ/タグと同じ流儀で管理する。
export interface PlayerItem {
  id: string
  gameProfileId: string
  name: string
  order: number
}

// 1マッチ = 1回の対戦単位
export interface Match {
  id: string
  gameProfileId: string
  date: string
  tags: string[]
  myDeckId?: string
  opponentDeckIds: string[]
  opponentPlayerIds: string[]
  result: 'win' | 'lose' | 'draw'
  format?: 'BO1' | 'BO3' | 'BO5' | 'EDH-pod'
  note: string
  createdAt: string
}

// ライフ推移の1イベント（カウンター操作を裏で記録）
export interface LifeEvent {
  t: string
  player: string
  from: number
  to: number
  reason?: string
}

// 勝敗決定時点での各プレイヤーのライフ（変動回数ではなく、確定した実値を残す）
export interface FinalLifeSnapshot {
  name: string
  life: number
}

// ユーザーが設定するゲーム別の壁紙画像。プロファイルID＝主キー（1プロファイル1枚）。
// サイズが大きくなりうるため、バックアップJSONには含めない（端末内だけの設定）。
export interface Wallpaper {
  gameProfileId: string
  blob: Blob
  updatedAt: string
}

// マッチ内の各ゲーム（BO3なら最大3つ）
export interface GameRecord {
  id: string
  matchId: string
  gameIndex: number
  onThePlay?: 'me' | 'opponent'
  mulligans: { me: number; opponent?: number }
  result?: 'win' | 'lose' | 'draw'
  lifeLog?: LifeEvent[]
  finalLife?: FinalLifeSnapshot[]
}
