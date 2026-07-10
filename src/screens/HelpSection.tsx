import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { HELP_CATEGORIES } from '../content/helpContent'

// 1問ぶんの折りたたみ項目。タップで開閉する。
function HelpAccordionItem({ id, q, a, open, onToggle }: {
  id: string
  q: string
  a: string
  open: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04]">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-200"
      >
        <span>{q}</span>
        <ChevronDown
          size={15}
          className={'shrink-0 text-slate-500 transition-transform ' + (open ? 'rotate-180' : '')}
        />
      </button>
      {open && (
        <p className="whitespace-pre-wrap border-t border-white/10 px-3 py-2.5 text-sm leading-relaxed text-slate-400">
          {a}
        </p>
      )}
    </div>
  )
}

// 「使い方・よくある質問」本体。Settings画面や起動時の案内からSheetで開く。
// 新しい機能を作ったら、対応するQ&Aを src/content/helpContent.ts に追記・更新する運用（DESIGN.md参照）。
//
// expandFirstItem: 起動時の案内から開いた時だけ、先頭（＝「はじめての方へ」の
// ホーム画面追加の手順）を最初から開いた状態で見せる。
export function HelpSection({ expandFirstItem = false }: { expandFirstItem?: boolean }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    expandFirstItem ? new Set(['0-0']) : new Set(),
  )

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {HELP_CATEGORIES.map((cat, ci) => (
        <div key={cat.title}>
          <div className="mb-2 text-sm font-semibold text-slate-300">{cat.title}</div>
          <div className="flex flex-col gap-1.5">
            {cat.items.map((item, ii) => {
              const id = `${ci}-${ii}`
              return (
                <HelpAccordionItem
                  key={id}
                  id={id}
                  q={item.q}
                  a={item.a}
                  open={openIds.has(id)}
                  onToggle={toggle}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
