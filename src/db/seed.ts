import type { GameProfile } from './types'

// 内蔵ゲームプロファイルのシード（DESIGN.md §3 フェーズ0）。
// isBuiltIn: true。ユーザーが後から独自プロファイルを追加できる設計。
// id は固定文字列にして、再シード時に重複しないようにする。
//
// 【重要】内蔵プロファイルはユーザーが編集できる（DESIGN.md §12-1）。そのため ensureSeed() は
// 「まだ無いidだけ入れる」方式であり、ここの定義を後から書き換えても、既に使っている人の端末には
// 反映されない。ここは「新規インストール時の初期値」＋「初期設定に戻す」の戻り先という位置づけ。
export const BUILT_IN_PROFILES: GameProfile[] = [
  {
    id: 'builtin-mtg-1v1',
    name: 'MTG (Legacy/構築 1v1)',
    hasLifeCounter: true,
    startingLife: 20,
    playerCountDefault: 2,
    supportsCommanderDamage: false,
    // 毒・エネルギー・経験は使わない対戦の方が多く、常時表示だと逆に邪魔になるため既定オフ。
    // 必要な人は「ゲームを追加」で自分用のプロファイルを作り、その他カウンターとして足せる。
    counterTypes: [],
    diceDefaults: ['d6', 'd20'],
    isBuiltIn: true,
    accentColor: '#38bdf8', // sky
  },
  {
    id: 'builtin-mtg-edh',
    name: 'MTG (EDH/統率者 多人数)',
    hasLifeCounter: true,
    startingLife: 40,
    playerCountDefault: 4,
    supportsCommanderDamage: true,
    counterTypes: [],
    diceDefaults: ['d6', 'd20'],
    isBuiltIn: true,
    accentColor: '#a78bfa', // violet
  },
  {
    id: 'builtin-holoca',
    name: 'ホロカ (ホロライブOCG)',
    // ホロカは対戦中にライフを増減させる場面はほぼ無いが、勝敗決定時点の最終値を
    // 記録・分析したい人のためにライフ表示自体は残す（手入力で最終値を入れる用途）。
    // エール/ホロパワーは外部でのカウント不要とのことなので、その他カウンターは無し。
    hasLifeCounter: true,
    startingLife: 0,
    playerCountDefault: 2,
    supportsCommanderDamage: false,
    counterTypes: [],
    diceDefaults: ['d6'],
    isBuiltIn: true,
    accentColor: '#f472b6', // pink
  },
]

// 「初期設定に戻す」用に、内蔵プロファイルの出荷時定義を id から引く。
export function getBuiltInProfile(id: string): GameProfile | null {
  return BUILT_IN_PROFILES.find((p) => p.id === id) ?? null
}
