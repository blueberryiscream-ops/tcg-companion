import type { TrendPoint } from './stats'

// 依存ライブラリなしの軽量SVG折れ線グラフ（累積勝率の推移）。
export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="py-6 text-center text-sm text-slate-500">
        まだグラフを描くには対戦数が足りません
      </div>
    )
  }

  const w = 320
  const h = 100
  const pad = 8
  const maxX = points[points.length - 1].matchIndex
  const xScale = (i: number) => pad + (i / maxX) * (w - pad * 2)
  const yScale = (v: number) => h - pad - v * (h - pad * 2)
  const path = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(p.matchIndex).toFixed(1)} ${yScale(p.cumulativeWinRate).toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full">
      <line
        x1={pad}
        y1={yScale(0.5)}
        x2={w - pad}
        y2={yScale(0.5)}
        stroke="rgba(255,255,255,0.15)"
        strokeDasharray="4 4"
      />
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2" />
      <circle cx={xScale(last.matchIndex)} cy={yScale(last.cumulativeWinRate)} r="3" fill="#38bdf8" />
      <text x={w - pad} y={12} textAnchor="end" fontSize="10" fill="#94a3b8">
        {Math.round(last.cumulativeWinRate * 100)}%
      </text>
      <text x={pad} y={12} fontSize="10" fill="#64748b">
        累積勝率
      </text>
    </svg>
  )
}
