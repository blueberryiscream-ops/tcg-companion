import { useLiveQuery } from 'dexie-react-hooks'
import { listTags, createTag, renameTag, deleteTag, reorderTags } from '../db/repo'
import { EditableChipGrid } from './EditableChipGrid'

// タグの複数選択＋その場で新規追加・並び替え・改名・削除。
// タグは名前(string)で Match に紐づくため、id⇔name の変換をこの中で吸収する。
export function TagPicker({
  profileId,
  selected,
  onChange,
}: {
  profileId: string
  selected: string[]
  onChange: (tags: string[]) => void
}) {
  const tagItems = useLiveQuery(() => listTags(profileId), [profileId]) ?? []

  function toggleById(id: string) {
    const tag = tagItems.find((t) => t.id === id)
    if (!tag) return
    onChange(
      selected.includes(tag.name) ? selected.filter((n) => n !== tag.name) : [...selected, tag.name],
    )
  }

  async function handleAdd(name: string) {
    const tag = await createTag(profileId, name)
    if (!selected.includes(tag.name)) onChange([...selected, tag.name])
  }

  async function handleRename(id: string, newName: string) {
    const tag = tagItems.find((t) => t.id === id)
    if (!tag) return
    const oldName = tag.name
    await renameTag(profileId, id, newName)
    if (selected.includes(oldName)) {
      onChange(selected.map((n) => (n === oldName ? newName : n)))
    }
  }

  async function handleDelete(id: string) {
    const tag = tagItems.find((t) => t.id === id)
    if (!tag) return
    const ok = window.confirm(
      `タグ「${tag.name}」を削除しますか？\n⚠️ このタグが付いている過去の対戦記録からも、タグが実際に取り除かれます（対戦記録自体は消えません）。`,
    )
    if (!ok) return
    await deleteTag(profileId, id)
    if (selected.includes(tag.name)) onChange(selected.filter((n) => n !== tag.name))
  }

  const selectedIds = tagItems.filter((t) => selected.includes(t.name)).map((t) => t.id)

  return (
    <div>
      <div className="mb-1 text-xs text-slate-400">タグ（大会名・フォーマット等・自由）</div>
      <EditableChipGrid
        items={tagItems}
        selectedIds={selectedIds}
        selectedClassName="bg-emerald-500 text-white"
        onToggleSelect={toggleById}
        onAdd={handleAdd}
        onRename={handleRename}
        onDelete={handleDelete}
        onReorder={reorderTags}
        addPlaceholder="+ 新しいタグ"
      />
    </div>
  )
}
