// 「最後にバックアップを書き出したのはいつか」をlocalStorageに覚えておき、
// しばらく経っていたらSettings画面でそっと知らせるための小さなヘルパー。
const STORAGE_KEY = 'tcg-companion:last-backup-at'

// この日数以上経っていたら、そろそろ書き出しておくよう促す。
export const REMINDER_THRESHOLD_DAYS = 14

export function getLastBackupAt(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function recordBackupNow(): void {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString())
}

export function daysSince(iso: string): number {
  const diffMs = Date.now() - new Date(iso).getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}
