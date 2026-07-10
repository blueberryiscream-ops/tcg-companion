import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// 「対戦を記録する」画面でどの項目を出すか、ライブ画面の文字量をどうするか、という
// アプリ全体の表示設定。ブラウザのlocalStorageに保存するだけ（サーバー不要・0円）。
export interface UiPrefs {
  showMyDeck: boolean
  showOpponentDeck: boolean
  showTags: boolean
  showOpponentPlayer: boolean
  showNote: boolean
  compactLiveScreen: boolean // 操作に慣れた人向け：文字ラベルを消してアイコンだけにする
  wakeLockEnabled: boolean // 対戦中に画面を自動消灯させない（Wake Lock）。既定オフ。
  fullscreenOnPlay: boolean // 対戦中はブラウザのバーを隠す全画面表示にする。既定オフ。
}

const DEFAULT_PREFS: UiPrefs = {
  showMyDeck: true,
  showOpponentDeck: true,
  showTags: true,
  showOpponentPlayer: true,
  showNote: true,
  compactLiveScreen: false,
  wakeLockEnabled: false,
  fullscreenOnPlay: false,
}

const STORAGE_KEY = 'tcg-companion:ui-prefs'

function loadPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

interface UiPrefsContextValue {
  prefs: UiPrefs
  setPref: <K extends keyof UiPrefs>(key: K, value: UiPrefs[K]) => void
}

const UiPrefsContext = createContext<UiPrefsContextValue | null>(null)

export function UiPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UiPrefs>(loadPrefs)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  function setPref<K extends keyof UiPrefs>(key: K, value: UiPrefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  return <UiPrefsContext.Provider value={{ prefs, setPref }}>{children}</UiPrefsContext.Provider>
}

export function useUiPrefs(): UiPrefsContextValue {
  const ctx = useContext(UiPrefsContext)
  if (!ctx) throw new Error('useUiPrefs must be used within UiPrefsProvider')
  return ctx
}
