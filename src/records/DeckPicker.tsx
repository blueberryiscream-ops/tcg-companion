import { Layers } from 'lucide-react'
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
      `「${deck?.name ?? ''}」を削除しますか？\n⚠️ このデッキを使った過去の対戦記録からも表示が消えます（記録データ自体は消えません）。`,
    )
    if (ok) await deleteDeck(id)
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-xs text-slate-400">
        <Layers size={12} strokeWidth={2} />
        {label}
      </div>
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
