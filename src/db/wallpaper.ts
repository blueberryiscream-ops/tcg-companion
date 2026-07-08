import { db } from './db'
import { nowIso } from '../lib/id'
import type { Wallpaper } from './types'

// ===== ユーザー壁紙（背景画像） =====
// DESIGN.md §8-1。画像はIndexedDBにblobで保存。既定オフ、設定した時だけ適用。
// バックアップJSON（backup.ts）には含めない＝端末内だけの設定。
// wallpapersテーブルは「id → 画像」の単純な対応。ゲームごと（gameProfileId）にも、
// 「ゲームを選ぶ」ホーム画面専用（HOME_WALLPAPER_ID）にも同じ仕組みを使い回す。

// ホーム画面（対戦タブの「ゲームを選ぶ」一覧）専用の壁紙を保存するための固定キー。
// gameProfileIdの形式（UUID）とは衝突しない固定文字列にしてある。
export const HOME_WALLPAPER_ID = '__home__'

export async function getWallpaper(id: string): Promise<Wallpaper | undefined> {
  return db.wallpapers.get(id)
}

export async function setWallpaper(id: string, file: File): Promise<void> {
  await db.wallpapers.put({ gameProfileId: id, blob: file, updatedAt: nowIso() })
}

export async function clearWallpaper(id: string): Promise<void> {
  await db.wallpapers.delete(id)
}
