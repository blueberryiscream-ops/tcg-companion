// マリガン回数カウンター。自分（と任意で相手）の回数を+/-。
// 数字はライブ画面の盤面に持っていて、フェーズ2で記録へ自動で渡る。
export function MulliganTracker({
  mulligans,
  onChange,
}: {
  mulligans: { me: number; opponent: number }
  onChange: (who: 'me' | 'opponent', delta: number) => void
}) {
  const rows: { who: 'me' | 'opponent'; label: string; value: number }[] = [
    { who: 'me', label: 'あなた', value: mulligans.me },
    { who: 'opponent', label: '相手（任意）', value: mulligans.opponent },
  ]

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div
          key={r.who}
          className="flex items-center justify-between rounded-xl bg-white/5 p-3"
        >
          <span className="text-slate-200">{r.label}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange(r.who, -1)}
              className="h-11 w-11 rounded-lg bg-white/10 text-2xl active:bg-white/20"
            >
              −
            </button>
            <span className="w-8 text-center text-3xl font-bold tabular-nums">{r.value}</span>
            <button
              onClick={() => onChange(r.who, 1)}
              className="h-11 w-11 rounded-lg bg-white/10 text-2xl active:bg-white/20"
            >
              ＋
            </button>
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">
        ※ ロンドン・マリガンの回数（引き直した回数）を数える想定です。
      </p>
    </div>
  )
}
