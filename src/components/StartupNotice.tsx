import { useState } from 'react'
import { X, Smartphone, HelpCircle } from 'lucide-react'
import { IS_IOS, isStandalone } from '../lib/platform'
import { isIntroSeen, markIntroSeen, isIosBannerDismissed, dismissIosBanner } from '../lib/firstRun'

type NoticeKind = 'ios' | 'intro' | null

// どの案内を出すか。優先度は「iOSでホーム画面に追加されていない」＞「初回起動」。
// iOSはホーム画面に追加しないとブラウザにデータを消される可能性があるため、そちらが最重要
// （DESIGN.md §12-2・§12-6）。ホーム画面から開けば isStandalone() が真になり自然に消える。
function decideNotice(): NoticeKind {
  if (IS_IOS && !isStandalone() && !isIosBannerDismissed()) return 'ios'
  if (!isIntroSeen()) return 'intro'
  return null
}

// 画面上部に出る、閉じられる1行案内。押し付けない（×でいつでも消せる）。
export function StartupNotice({ onOpenHelp }: { onOpenHelp: () => void }) {
  const [kind, setKind] = useState<NoticeKind>(decideNotice)

  if (!kind) return null

  function close() {
    if (kind === 'ios') dismissIosBanner()
    else markIntroSeen()
    setKind(null)
  }

  // 案内を読みに行った時点で「初回の案内は見た」とみなす。
  // iOSの案内は、実際にホーム画面へ追加されるまで（または×を押すまで）出し続ける。
  function openHelp() {
    markIntroSeen()
    if (kind === 'intro') setKind(null)
    onOpenHelp()
  }

  const isIos = kind === 'ios'

  return (
    <div
      className={
        'flex items-center gap-2 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-xs ' +
        (isIos
          ? 'border-b border-amber-400/20 bg-amber-500/10 text-amber-100'
          : 'border-b border-white/10 bg-white/[0.06] text-slate-300')
      }
    >
      {isIos ? (
        <Smartphone size={15} strokeWidth={2} className="shrink-0" />
      ) : (
        <HelpCircle size={15} strokeWidth={2} className="shrink-0" />
      )}
      <span className="min-w-0 flex-1 leading-snug">
        {isIos
          ? 'iPhoneでは「ホーム画面に追加」しないと、記録が消えることがあります。'
          : 'はじめての方へ。使い方の短い案内があります。'}
      </span>
      <button
        onClick={openHelp}
        className={
          'shrink-0 rounded-lg px-2.5 py-1.5 font-semibold transition-transform active:scale-95 ' +
          (isIos ? 'bg-amber-400/20 active:bg-amber-400/30' : 'bg-white/10 active:bg-white/20')
        }
      >
        {isIos ? '追加のしかた' : '見る'}
      </button>
      <button
        onClick={close}
        aria-label="この案内を閉じる"
        className="shrink-0 rounded-lg p-1.5 opacity-60 transition-transform active:scale-95"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}
