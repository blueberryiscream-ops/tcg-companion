export type TabKey = 'live' | 'records' | 'settings'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'live', label: '対戦', icon: '⚔️' },
  { key: 'records', label: '記録', icon: '📋' },
  { key: 'settings', label: '設定', icon: '⚙️' },
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
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-all ' +
              (on ? 'text-[var(--accent)]' : 'text-slate-400')
            }
          >
            <span className={'text-xl leading-none transition-transform ' + (on ? 'scale-110' : '')}>
              {t.icon}
            </span>
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
