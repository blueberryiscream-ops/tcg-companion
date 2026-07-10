// 端末・ブラウザの種類の判定と、データ保護のための永続化要求（DESIGN.md §12-2）。
// iOSのブラウザは中身が全てSafari(WebKit)なので、「iPhoneでChromeを使えば回避」は成立しない。
// そのため判定は「ブラウザ名」ではなく「iOSかどうか」で行う。

// iPhone / iPad かどうか。iPadOSはUserAgentで「Mac」を名乗るため、タッチ対応で見分ける。
export const IS_IOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

// ホーム画面のアイコンから開いた（＝PWAとしてインストール済みの）状態か。
// iOS Safariは navigator.standalone、その他は display-mode メディアクエリで分かる。
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

// ブラウザに「このサイトのデータを勝手に消さないでほしい」と要求する（Storage API）。
// Safari 17以降・Chrome等が対応。非対応や拒否でも困らないので、黙って諦める。
// これは保険であって、最大の防御は「ホーム画面に追加」＋「バックアップの書き出し」。
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage: StorageManager | undefined = navigator.storage
    if (!storage || typeof storage.persist !== 'function') return false
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return false
  }
}
