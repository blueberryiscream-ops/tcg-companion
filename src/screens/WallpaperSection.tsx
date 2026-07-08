import { useRef } from 'react'
import { setWallpaper, clearWallpaper } from '../db/wallpaper'
import { useWallpaperUrl } from '../live/useWallpaperUrl'

// 壁紙（背景画像）を選ぶ/消す小部品。DESIGN.md §8-1。既定オフ・端末内保存のみ。
// idは「保存先の区別キー」。ゲームごとの壁紙（gameProfileId）にも、ホーム画面専用の
// 壁紙（HOME_WALLPAPER_ID）にも同じ部品を使い回す。
export function WallpaperSection({
  id,
  title,
  description,
}: {
  id: string
  title: string
  description: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const url = useWallpaperUrl(id)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await setWallpaper(id, file)
  }

  return (
    <div>
      <div className="mb-1 text-xs text-slate-400">{title}</div>
      <p className="mb-2 text-xs text-slate-500">{description}</p>
      <div className="flex items-center gap-3">
        {url && (
          <div
            className="h-14 w-14 shrink-0 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${url})` }}
          />
        )}
        <div className="flex flex-1 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-slate-200 active:bg-white/20"
          >
            🖼 {url ? '画像を変更' : '画像を選ぶ'}
          </button>
          {url && (
            <button
              onClick={() => clearWallpaper(id)}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-rose-300 active:bg-white/20"
            >
              消す
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
