import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { BottomTabs, type TabKey } from './components/BottomTabs'
import { LiveScreen } from './screens/LiveScreen'
import { RecordsScreen } from './screens/RecordsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { HelpSection } from './screens/HelpSection'
import { StartupNotice } from './components/StartupNotice'
import { Sheet } from './components/Sheet'
import { UiPrefsProvider } from './lib/uiPrefs'
import { DEFAULT_ACCENT } from './lib/color'
import { loadLiveSession } from './live/liveSession'

export function App() {
  const [tab, setTab] = useState<TabKey>('live')

  // 「使い方・よくある質問」。設定タブのボタンと、起動時の案内バナーの両方から開くため、
  // Sheetはここ（アプリ全体）で持つ。バナーから開いた時だけ先頭項目を開いて見せる。
  const [help, setHelp] = useState<{ open: boolean; fromNotice: boolean }>({
    open: false,
    fromNotice: false,
  })

  // IndexedDB のプロファイル一覧をリアクティブに読む（変わると自動再描画）。
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])

  // 現在選んでいるゲームプロファイル。対戦の途中で端末に保存されたセッションがあれば、
  // 再読み込み後も同じゲームの画面に自動で戻す（スマホでアプリを切り替えた後の対策）。
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    () => loadLiveSession()?.profileId ?? null,
  )

  // ゲーム別テーマ（DESIGN.md §8-1）: 選んでいるプロファイルのアクセント色を
  // CSS変数 --accent としてアプリ全体に配る。子要素は bg-[var(--accent)] 等で参照する。
  const selectedProfile = (profiles ?? []).find((p) => p.id === selectedProfileId) ?? null
  const accentColor = selectedProfile?.accentColor ?? DEFAULT_ACCENT
  const themeStyle = { '--accent': accentColor } as CSSProperties

  // 3画面は常にマウントしたまま、表示だけ切り替える。
  // こうすると「記録」「設定」に一瞬移動しても、対戦中のライフ・マリガン等が消えない。
  return (
    <UiPrefsProvider>
      <div className="flex h-full flex-col" style={themeStyle}>
        <StartupNotice onOpenHelp={() => setHelp({ open: true, fromNotice: true })} />
        <main className="relative min-h-0 flex-1">
          <TabPanel active={tab === 'live'}>
            <LiveScreen
              profiles={profiles ?? []}
              selectedProfileId={selectedProfileId}
              onSelectProfile={setSelectedProfileId}
              isActiveTab={tab === 'live'}
            />
          </TabPanel>
          <TabPanel active={tab === 'records'} scroll>
            <RecordsScreen profiles={profiles ?? []} selectedProfileId={selectedProfileId} />
          </TabPanel>
          <TabPanel active={tab === 'settings'} scroll>
            <SettingsScreen
              profiles={profiles ?? []}
              onOpenHelp={() => setHelp({ open: true, fromNotice: false })}
            />
          </TabPanel>
        </main>
        <BottomTabs active={tab} onChange={setTab} />
        <Sheet
          open={help.open}
          title="使い方・よくある質問"
          onClose={() => setHelp({ open: false, fromNotice: false })}
        >
          <HelpSection expandFirstItem={help.fromNotice} />
        </Sheet>
      </div>
    </UiPrefsProvider>
  )
}

// 非表示のときは display:none（hidden）にするだけ。中の状態は保持され続ける。
function TabPanel({
  active,
  scroll,
  children,
}: {
  active: boolean
  scroll?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={(active ? 'block ' : 'hidden ') + 'h-full ' + (scroll ? 'overflow-y-auto' : '')}>
      {children}
    </div>
  )
}
