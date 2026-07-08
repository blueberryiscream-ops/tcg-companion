import type { PlayerItem } from '../db/types'
import { renamePlayer, deletePlayer, reorderPlayers } from '../db/repo'
import { EditableChipGrid } from './EditableChipGrid'

// 対面プレイヤー（対戦相手の名前）の複数選択＋その場で新規追加・並び替え・改名・削除。
// デッキと同じ流儀：Matchにはid配列で紐づく（改名してもMatch側の書き換え不要）。
export function PlayerPicker({
  label = '対面プレイヤー（複数選択可）',
  players,
  selectedIds,
  onToggle,
  onAdd,
}: {
  label?: string
  players: PlayerItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onAdd: (name: string) => void
}) {
  async function handleDelete(id: string) {
    const player = players.find((p) => p.id === id)
    const ok = window.confirm(
      `「${player?.name ?? ''}」を削除しますか？\n⚠️ このプレイヤーを使った過去の対戦記録からも表示が消えます（記録データ自体は消えません）。`,
    )
    if (ok) await deletePlayer(id)
  }

  return (
    <div>
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      <EditableChipGrid
        items={players}
        selectedIds={selectedIds}
        selectedClassName="bg-amber-500 text-black"
        onToggleSelect={onToggle}
        onAdd={onAdd}
        onRename={renamePlayer}
        onDelete={handleDelete}
        onReorder={reorderPlayers}
        addPlaceholder="+ 新しいプレイヤー名"
      />
    </div>
  )
}
