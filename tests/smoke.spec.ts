import { test, expect, type Page } from '@playwright/test'

// WebKit（iPhoneのSafariの中身）での動作確認（DESIGN.md §12-3）。
// 「WebKitでだけ落ちる／APIが無い」類の不具合を、実機なしで拾うのが目的。
// 特に見張りたいのは IndexedDB(Dexie)・structuredClone・Storage API まわり。

// ページ内で起きたJSエラーとconsole.errorを集める。1つでも出たらテストを落とす。
function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })
  return errors
}

test('iPhone(WebKit)で起動し、内蔵ゲームが表示される', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')

  // Dexie/IndexedDB が動いていれば、内蔵プロファイル3つがボタンとして並ぶ。
  await expect(page.getByRole('button', { name: /ホロカ/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /MTG \(Legacy/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /MTG \(EDH/ })).toBeVisible()

  expect(errors).toEqual([])
})

test('iOSでは「ホーム画面に追加」の案内が出て、手順を開ける（§12-2）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')

  // iPhoneのUAかつホーム画面に追加されていない状態なので、iOS向けの案内が出るはず。
  await expect(page.getByText(/ホーム画面に追加.*記録が消えることがあります/)).toBeVisible()

  await page.getByRole('button', { name: '追加のしかた' }).click()

  // ヘルプの先頭カテゴリ「はじめての方へ」と、開いた状態の①が見えること。
  await expect(page.getByText('はじめての方へ', { exact: true })).toBeVisible()
  await expect(page.getByText(/Safariでこのページを開き/)).toBeVisible()

  expect(errors).toEqual([])
})

test('ライフの増減とUndoが動く（structuredCloneがWebKitで動くか）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await page.getByRole('button', { name: /MTG \(Legacy/ }).click()

  const lifeButtons = page.getByRole('button', { name: 'ライフ（タップで手入力）' })
  await expect(lifeButtons).toHaveCount(2)
  await expect(lifeButtons.first()).toHaveText('20')

  // どちらかのパネルのライフを1つ増やす → Undoで戻る（Undoは盤面のディープコピーに依存）。
  await page.getByRole('button', { name: 'increase' }).first().click()
  await expect(lifeButtons.first()).toHaveText('21')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(lifeButtons.first()).toHaveText('20')

  expect(errors).toEqual([])
})

test('ゲームプロファイルを編集して保存できる（§12-1）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await page.getByRole('button', { name: '設定' }).click()

  // 内蔵ゲームにも鉛筆（編集）があり、削除は無い。
  await page.getByRole('button', { name: 'ホロカ (ホロライブOCG)を編集' }).click()
  await expect(page.getByRole('heading', { name: 'ゲームを編集' })).toBeVisible()

  const nameInput = page.locator('input').first()
  await nameInput.fill('ホロカ(テスト)')
  await page.getByRole('button', { name: '保存する' }).click()

  // 一覧に反映され、リロードしても内蔵定義に上書きされない（ensureSeedは挿入のみ）。
  // 名前はカード・並び替え用の選択肢にも出るため、一意になるボタンのラベルで確かめる。
  await expect(page.getByRole('button', { name: 'ホロカ(テスト)を編集' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '設定' }).click()
  await expect(page.getByRole('button', { name: 'ホロカ(テスト)を編集' })).toBeVisible()

  // 内蔵ゲームなので削除ボタンは無く、「初期設定に戻す」がある。押せば出荷時の名前に戻る。
  await expect(page.getByRole('button', { name: 'ホロカ(テスト)を削除' })).toHaveCount(0)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'ホロカ(テスト)を初期設定に戻す' }).click()
  await expect(page.getByRole('button', { name: 'ホロカ (ホロライブOCG)を編集' })).toBeVisible()

  expect(errors).toEqual([])
})
