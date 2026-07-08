import type { GameProfile } from './types'

// 内蔵ゲームプロファイルのシード（DESIGN.md §3 フェーズ0）。
// isBuiltIn: true。ユーザーが後から独自プロファイルを追加できる設計。
// id は固定文字列にして、再シード時に重複しないようにする。
export const BUILT_IN_PROFILES: GameProfile[] = [
  {
    id: 'builtin-mtg-1v1',
    name: 'MTG (Legacy/構築 1v1)',
    startingLife: 20,
    playerCountDefault: 2,
    supportsCommanderDamage: false,
    counterTypes: [
      { key: 'poison', label: '毒', defaultValue: 0 },
      { key: 'energy', label: 'エネルギー', defaultValue: 0 },
      { key: 'experience', label: '経験', defaultValue: 0 },
    ],
    diceDefaults: ['d6', 'd20'],
    isBuiltIn: true,
    accentColor: '#38bdf8', // sky
  },
  {
    id: 'builtin-mtg-edh',
    name: 'MTG (EDH/統率者 多人数)',
    startingLife: 40,
    playerCountDefault: 4,
    supportsCommanderDamage: true,
    counterTypes: [
      { key: 'poison', label: '毒', defaultValue: 0 },
      { key: 'experience', label: '経験', defaultValue: 0 },
    ],
    diceDefaults: ['d6', 'd20'],
    isBuiltIn: true,
    accentColor: '#a78bfa', // violet
  },
  {
    id: 'builtin-holoca',
    name: 'ホロカ (ホロライブOCG)',
    // ホロカはライフ管理を本体で完結しがち。汎用カウンターとして暫定でライフ相当を用意。
    startingLife: 0,
    playerCountDefault: 2,
    supportsCommanderDamage: false,
    counterTypes: [
      { key: 'cheer', label: 'エール', defaultValue: 0 },
      { key: 'holopower', label: 'ホロパワー', defaultValue: 0 },
    ],
    diceDefaults: ['d6'],
    isBuiltIn: true,
    accentColor: '#f472b6', // pink
  },
]
