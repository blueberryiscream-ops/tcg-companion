import { Swords, ClipboardList, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TabKey = 'live' | 'records' | 'settings'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'live', label: '対戦', icon: Swords },
  { key: 'records', label: '記録', icon: ClipboardList },
  { key: 'settings', label: '設定', icon: Settings },
]

// 画面下の切替タブ。親指で押しやすいよう下側・大きめ。
export function BottomTabs({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (t: TabKey) => void
}) {
  return (
    <nav className="flex shrink-0 border-t border-white/10 bg-[#0e1420] pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => {
        const on = t.key === active
        const Icon = t.icon
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={
              'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ' +
              (on ? 'text-[var(--accent)]' : 'text-slate-500 active:text-slate-300')
            }
          >
            {/* 選択中タブの上に短いアクセントバー。既定色に依存しないアプリらしいディテール。 */}
            <span
              className={
                'absolute top-0 h-0.5 w-8 rounded-full bg-[var(--accent)] transition-opacity ' +
                (on ? 'opacity-100' : 'opacity-0')
              }
            />
            <Icon
              size={22}
              strokeWidth={on ? 2.25 : 1.75}
              className={'transition-transform ' + (on ? 'scale-105' : '')}
            />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
