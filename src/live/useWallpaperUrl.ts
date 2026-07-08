import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getWallpaper } from '../db/wallpaper'

// 指定プロファイルの壁紙blobを、表示用の一時URL（blob:...）に変換する。
// 画面から消えたり壁紙が変わったら古いURLはちゃんと解放する。
export function useWallpaperUrl(gameProfileId: string | null): string | null {
  const record = useLiveQuery(
    () => (gameProfileId ? getWallpaper(gameProfileId) : Promise.resolve(undefined)),
    [gameProfileId],
  )

  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!record?.blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(record.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [record?.blob])

  return url
}
