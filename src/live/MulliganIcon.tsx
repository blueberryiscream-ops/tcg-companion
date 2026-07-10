// マリガン専用アイコン：手札を山札に戻してシャッフルし、引き直すイメージ。
// lucideの円環矢印（RefreshCw相当）の中央に、山札を示す小さなカードを重ねている。
export function MulliganIcon({
  size = 24,
  strokeWidth = 2,
  className,
}: {
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
      <rect x="9.4" y="8.4" width="5.2" height="7.2" rx="1" />
    </svg>
  )
}
