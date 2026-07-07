// UUID 文字列を作る小さな道具。最近のブラウザは標準機能を持っている。
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // 予備（古い環境向け）
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function nowIso(): string {
  return new Date().toISOString()
}
