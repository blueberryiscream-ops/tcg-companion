import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Check, X, Plus } from 'lucide-react'

export interface ChipItem {
  id: string
  name: string
}

// 1枚のチップ。編集モード中は掴んでドラッグでき、タップで改名、✕で削除。
// 通常時は今までどおりタップで選択。
function SortableChip({
  item,
  selected,
  selectedClassName,
  editMode,
  onTap,
  onDelete,
}: {
  item: ChipItem
  selected: boolean
  selectedClassName: string
  editMode: boolean
  onTap: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editMode,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        {...(editMode ? { ...attributes, ...listeners } : {})}
        onClick={onTap}
        className={
          'rounded-lg border px-3 py-1.5 text-sm transition-transform active:scale-95 ' +
          (editMode
            ? 'touch-none select-none border-white/10 bg-white/10 text-slate-300'
            : selected
              ? 'border-transparent ' + selectedClassName
              : 'border-white/10 bg-white/[0.06] text-slate-200 active:bg-white/15')
        }
      >
        {item.name}
      </button>
      {editMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow active:bg-rose-400"
          aria-label={`${item.name}を削除`}
        >
          <X size={12} strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

// 選択にも管理（並び替え・改名・削除）にも使う、実際に使う形そのままのチップ群。
// 右上の「編集」トグルで、選択モード ⇔ 編集モード（ドラッグ・改名・削除）を切り替える。
export function EditableChipGrid({
  items,
  selectedIds = [],
  selectedClassName = 'bg-[var(--accent)] text-white',
  onToggleSelect,
  onAdd,
  onRename,
  onDelete,
  onReorder,
  addPlaceholder = '+ 新規追加',
}: {
  items: ChipItem[]
  selectedIds?: string[]
  selectedClassName?: string
  onToggleSelect?: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onReorder: (orderedIds: string[]) => void
  addPlaceholder?: string
}) {
  const [editMode, setEditMode] = useState(false)
  const [newName, setNewName] = useState('')

  // マウス＝少し動いたらすぐドラッグ開始。タッチ＝長押し(200ms)してからドラッグ開始
  // （タッチは「動いた距離」で判定すると、長押し中の指の震えと衝突して掴めなくなるため）。
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(items, oldIndex, newIndex).map((i) => i.id))
  }

  function handleTap(item: ChipItem) {
    if (editMode) {
      const next = window.prompt('名前を変更', item.name)
      if (next === null) return
      const trimmed = next.trim()
      if (trimmed && trimmed !== item.name) onRename(item.id, trimmed)
    } else {
      onToggleSelect?.(item.id)
    }
  }

  function submitAdd() {
    const name = newName.trim()
    if (!name) return
    onAdd(name)
    setNewName('')
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={
            'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ' +
            (editMode ? 'text-emerald-400' : 'text-slate-500 active:text-slate-300')
          }
        >
          {editMode ? <Check size={13} strokeWidth={2.5} /> : <Pencil size={13} strokeWidth={2} />}
          {editMode ? '完了' : '編集'}
        </button>
      </div>

      {editMode && (
        <p className="mb-1.5 text-xs text-slate-500">掴んで並び替え／タップで名前変更／✕で削除</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-2 pt-1">
            {items.map((item) => (
              <SortableChip
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                selectedClassName={selectedClassName}
                editMode={editMode}
                onTap={() => handleTap(item)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
            {items.length === 0 && <span className="text-sm text-slate-500">まだありません</span>}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-2 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitAdd()
            }
          }}
          placeholder={addPlaceholder}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-white placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={submitAdd}
          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm transition-transform active:scale-95 active:bg-white/15"
        >
          <Plus size={15} strokeWidth={2.5} />
          追加
        </button>
      </div>
    </div>
  )
}
