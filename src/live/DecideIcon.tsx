// 先後決め専用アイコン：コインを半分だけ塗って「表裏(五分五分)で決める」イメージを表す。
// 文字や矢印だと誤読されやすいため、あえて図形（コイン）だけにしている。
export function DecideIcon({
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  )
}
