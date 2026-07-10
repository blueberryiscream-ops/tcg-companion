// 表示するかどうかのスイッチ1行。設定画面・ゲームプロファイル追加フォームで使い回す。
// アクセント色に頼らず常に固定色（sky）にしている＝画面ごとに色が変わって混乱するのを防ぐため。
export function PrefToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-left"
    >
      <span className="text-sm text-slate-200">{label}</span>
      <span
        className={
          'flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ' +
          (checked ? 'justify-end bg-sky-500' : 'justify-start bg-white/15')
        }
      >
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </span>
    </button>
  )
}
