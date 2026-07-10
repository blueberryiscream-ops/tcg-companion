// 初回起動の案内バナーを「一度だけ」出すためのフラグ（localStorage）。
// 押し付けないことが原則なので、×で閉じたらもう出さない（DESIGN.md §12-6）。

const INTRO_KEY = 'tcg-companion:intro-seen'
const IOS_BANNER_KEY = 'tcg-companion:ios-banner-dismissed'

function getFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function setFlag(key: string): void {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // プライベートブラウズ等で書けなくても、案内が毎回出るだけなので無視する。
  }
}

export const isIntroSeen = () => getFlag(INTRO_KEY)
export const markIntroSeen = () => setFlag(INTRO_KEY)

// iOSの「ホーム画面に追加」案内は、閉じられたら二度と出さない。
// なお、ホーム画面に追加されれば isStandalone() が真になり、閉じなくても自然に消える。
export const isIosBannerDismissed = () => getFlag(IOS_BANNER_KEY)
export const dismissIosBanner = () => setFlag(IOS_BANNER_KEY)
