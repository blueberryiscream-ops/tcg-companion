import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { BottomTabs, type TabKey } from './components/BottomTabs'
import { LiveScreen } from './screens/LiveScreen'
import { RecordsScreen } from './screens/RecordsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { UiPrefsProvider } from './lib/uiPrefs'

export function App() {
  const [tab, setTab] = useState<TabKey>('live')

  // IndexedDB のプロファイル一覧をリアクティブに読む（変わると自動再描画）。
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])

  // 現在選んでいるゲームプロファイル。初期は未選択。
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  // 3画面は常にマウントしたまま、表示だけ切り替える。
  // こうすると「記録」「設定」に一瞬移動しても、対戦中のライフ・マリガン等が消えない。
  return (
    <UiPrefsProvider>
      <div className="flex h-full flex-col">
        <main className="relative min-h-0 flex-1">
          <TabPanel active={tab === 'live'}>
            <LiveScreen
              profiles={profiles ?? []}
              selectedProfileId={selectedProfileId}
              onSelectProfile={setSelectedProfileId}
            />
          </TabPanel>
          <TabPanel active={tab === 'records'} scroll>
            <RecordsScreen profiles={profiles ?? []} selectedProfileId={selectedProfileId} />
          </TabPanel>
          <TabPanel active={tab === 'settings'} scroll>
            <SettingsScreen profiles={profiles ?? []} />
          </TabPanel>
        </main>
        <BottomTabs active={tab} onChange={setTab} />
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
