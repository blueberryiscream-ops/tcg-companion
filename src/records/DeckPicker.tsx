import type { Deck } from '../db/types'
import { renameDeck, deleteDeck, reorderDecks } from '../db/repo'
import { EditableChipGrid } from './EditableChipGrid'

// デッキの選択＋その場で新規追加・並び替え・改名・削除。
// 自分デッキ(単一)/対面デッキ(単一 or 複数)の両方で使う。
export function DeckPicker({
  label,
  decks,
  selectedIds,
  onToggle,
  onAdd,
}: {
  label: string
  decks: Deck[]
  selectedIds: string[]
  onToggle?: (id: string) => void
  onAdd: (name: string) => void
}) {
  async function handleDelete(id: string) {
    const deck = decks.find((d) => d.id === id)
    const ok = window.confirm(
      `「${deck?.name ?? ''}」を削除しますか？\n過去の記録の対戦相手表示には出せなくなります（記録自体は残ります）。`,
    )
    if (ok) await deleteDeck(id)
  }

  return (
    <div>
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      <EditableChipGrid
        items={decks}
        selectedIds={selectedIds}
        onToggleSelect={onToggle}
        onAdd={onAdd}
        onRename={renameDeck}
        onDelete={handleDelete}
        onReorder={reorderDecks}
        addPlaceholder="+ 新しいデッキ名"
      />
    </div>
  )
}
