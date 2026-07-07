import type { ReactNode } from 'react'

// 画面中央に出る小窓（モーダル）。対面で使うので、相手からも結果が見えるよう中央に置く。
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* 背景の暗幕。タップで閉じる。 */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-h-[85%] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#131a28] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm text-slate-200 active:bg-white/20"
          >
            閉じる
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
