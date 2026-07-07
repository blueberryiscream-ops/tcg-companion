import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { GameProfile } from '../db/types'
import {
  listAllMatches,
  listGameRecordsByMatchIds,
  getDeckNameMap,
  getPlayerNameMap,
  listDecks,
  listPlayers,
  listPastTags,
} from '../db/repo'
import {
  overallStats,
  statsByOpponentDeck,
  statsByMyDeck,
  statsByOnThePlay,
  statsByMulligan,
  winRateTrend,
} from '../records/stats'
import { TrendChart } from '../records/TrendChart'
import { buildGameRecordsCsv, downloadCsv } from '../records/csvExport'
import { useUiPrefs } from '../lib/uiPrefs'

const RESULT_LABEL: Record<string, string> = { win: '勝ち', lose: '負け', draw: '引き分け' }
const RESULT_COLOR: Record<string, string> = {
  win: 'bg-emerald-500/20 text-emerald-300',
  lose: 'bg-rose-500/20 text-rose-300',
  draw: 'bg-white/10 text-slate-300',
}

function pct(rate: number): string {
  return Math.round(rate * 100) + '%'
}

export function RecordsScreen({
  profiles,
  selectedProfileId,
}: {
  profiles: GameProfile[]
  selectedProfileId: string | null
}) {
  const profile = profiles.find((p) => p.id === selectedProfileId) ?? null
  const { prefs } = useUiPrefs()

  const allMatches = useLiveQuery(
    () => (profile ? listAllMatches(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const allGames = useLiveQuery(async () => {
    if (!allMatches) return []
    return listGameRecordsByMatchIds(allMatches.map((m) => m.id))
  }, [allMatches])
  const deckNames = useLiveQuery(
    () => (profile ? getDeckNameMap(profile.id) : Promise.resolve({} as Record<string, string>)),
    [profile?.id],
  )
  const opponentDecks = useLiveQuery(
    () => (profile ? listDecks(profile.id, false) : Promise.resolve([])),
    [profile?.id],
  )
  const myDecks = useLiveQuery(
    () => (profile ? listDecks(profile.id, true) : Promise.resolve([])),
    [profile?.id],
  )
  const pastTags = useLiveQuery(
    () => (profile ? listPastTags(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const players = useLiveQuery(
    () => (profile ? listPlayers(profile.id) : Promise.resolve([])),
    [profile?.id],
  )
  const playerNames = useLiveQuery(
    () => (profile ? getPlayerNameMap(profile.id) : Promise.resolve({} as Record<string, string>)),
    [profile?.id],
  )

  // フィルタ状態
  const [filterDeckId, setFilterDeckId] = useState('all')
  const [filterMyDeckId, setFilterMyDeckId] = useState('all')
  const [filterTag, setFilterTag] = useState('all')
  const [filterPlayerId, setFilterPlayerId] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [oldestFirst, setOldestFirst] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(true)
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)

  if (!profile) {
    return (
      <div className="p-4">
        <h1 className="mb-1 text-2xl font-bold">記録</h1>
        <p className="text-sm text-slate-400">先に「対戦」タブでゲームを選んでください。</p>
      </div>
    )
  }

  const filteredMatches = (allMatches ?? []).filter((m) => {
    if (filterDeckId !== 'all' && !m.opponentDeckIds.includes(filterDeckId)) return false
    if (filterMyDeckId !== 'all' && m.myDeckId !== filterMyDeckId) return false
    if (filterTag !== 'all' && !m.tags.includes(filterTag)) return false
    if (filterPlayerId !== 'all' && !(m.opponentPlayerIds ?? []).includes(filterPlayerId)) return false
    if (dateFrom && m.date < dateFrom) return false
    if (dateTo && m.date > dateTo) return false
    return true
  })
  const filteredMatchIds = new Set(filteredMatches.map((m) => m.id))
  const filteredGames = (allGames ?? []).filter((g) => filteredMatchIds.has(g.matchId))

  const displayMatches = oldestFirst ? [...filteredMatches].reverse() : filteredMatches

  const overall = overallStats(filteredMatches)
  const byDeck = statsByOpponentDeck(filteredMatches, deckNames ?? {})
  const byMyDeck = statsByMyDeck(filteredMatches, deckNames ?? {})
  const byPlay = statsByOnThePlay(filteredGames)
  const byMulligan = statsByMulligan(filteredGames)
  const trend = winRateTrend(filteredMatches)

  function handleExportCsv() {
    const csv = buildGameRecordsCsv(filteredMatches, filteredGames, deckNames ?? {}, playerNames ?? {})
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`${profile!.name}-記録-${today}.csv`, csv)
  }

  return (
    <div className="p-4">
      <h1 className="mb-1 text-2xl font-bold">記録</h1>
      <p className="mb-3 text-sm text-slate-400">{profile.name} の対戦</p>

      {/* フィルタ（設定タブで表示をオフにした項目は出さない） */}
      <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white/5 p-3">
        {(prefs.showMyDeck || prefs.showOpponentDeck) && (
          <div className="flex gap-2">
            {prefs.showMyDeck && (
              <select
                value={filterMyDeckId}
                onChange={(e) => setFilterMyDeckId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-sm text-white"
              >
                <option value="all">自分デッキ: すべて</option>
                {(myDecks ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            {prefs.showOpponentDeck && (
              <select
                value={filterDeckId}
                onChange={(e) => setFilterDeckId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-sm text-white"
              >
                <option value="all">対面デッキ: すべて</option>
                {(opponentDecks ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {(prefs.showTags || prefs.showOpponentPlayer) && (
          <div className="flex gap-2">
            {prefs.showTags && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-sm text-white"
              >
                <option value="all">タグ: すべて</option>
                {(pastTags ?? []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            {prefs.showOpponentPlayer && (
              <select
                value={filterPlayerId}
                onChange={(e) => setFilterPlayerId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-sm text-white"
              >
                <option value="all">対面プレイヤー: すべて</option>
                {(players ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-sm text-white"
          />
          <span className="text-xs text-slate-500">〜</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOldestFirst((v) => !v)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-300 active:bg-white/20"
          >
            並び順: {oldestFirst ? '古い順' : '新しい順'}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filteredGames.length === 0}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-300 active:bg-white/20 disabled:opacity-40"
          >
            ⬇ CSV書き出し（表示中の{filteredMatches.length}件）
          </button>
        </div>
      </div>

      {/* 分析サマリー */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-slate-500">
          {(allMatches ?? []).length === 0 ? (
            <>
              まだ記録はありません。
              <br />
              「対戦」タブの「この対戦を記録する」から始めてください。
            </>
          ) : (
            '条件に合う記録がありません。'
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold tabular-nums text-sky-300">{pct(overall.winRate)}</div>
              <div className="text-xs text-slate-400">
                {overall.total}戦 {overall.wins}勝{overall.losses}敗{overall.draws}分
              </div>
            </div>
            <button
              onClick={() => setShowAnalysis((v) => !v)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-300 active:bg-white/20"
            >
              {showAnalysis ? '詳細を隠す' : '詳細を見る'}
            </button>
          </div>

          <div className="mt-2">
            <TrendChart points={trend} />
          </div>

          {showAnalysis && (
            <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3">
              {/* 自分デッキ別 */}
              {byMyDeck.length > 0 && (
                <div>
                  <div className="mb-1 text-xs text-slate-400">自分デッキ別勝率</div>
                  <div className="flex flex-col gap-1">
                    {byMyDeck.map((d) => (
                      <div key={d.deckId} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{d.deckName}</span>
                        <span className="tabular-nums text-slate-400">
                          {pct(d.winRate)}（{d.wins}-{d.losses}-{d.draws} / {d.total}戦）
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 対面デッキ別 */}
              {byDeck.length > 0 && (
                <div>
                  <div className="mb-1 text-xs text-slate-400">対面デッキ別勝率</div>
                  <div className="flex flex-col gap-1">
                    {byDeck.map((d) => (
                      <div key={d.deckId} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{d.deckName}</span>
                        <span className="tabular-nums text-slate-400">
                          {pct(d.winRate)}（{d.wins}-{d.losses}-{d.draws} / {d.total}戦）
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 先手/後手別 */}
              {(byPlay.onPlay.total > 0 || byPlay.onDraw.total > 0) && (
                <div>
                  <div className="mb-1 text-xs text-slate-400">先手/後手別勝率</div>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">先手</span>
                      <span className="tabular-nums text-slate-400">
                        {byPlay.onPlay.total > 0 ? `${pct(byPlay.onPlay.winRate)}（${byPlay.onPlay.total}戦）` : '記録なし'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">後手</span>
                      <span className="tabular-nums text-slate-400">
                        {byPlay.onDraw.total > 0 ? `${pct(byPlay.onDraw.winRate)}（${byPlay.onDraw.total}戦）` : '記録なし'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* マリガン数別 */}
              {byMulligan.length > 0 && (
                <div>
                  <div className="mb-1 text-xs text-slate-400">マリガン数と勝率</div>
                  <div className="flex flex-col gap-1 text-sm">
                    {byMulligan.map((b) => (
                      <div key={b.mulligans} className="flex items-center justify-between">
                        <span className="text-slate-300">{b.mulligans}回</span>
                        <span className="tabular-nums text-slate-400">
                          {pct(b.winRate)}（{b.total}戦）
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 対戦一覧 */}
      <div className="flex flex-col gap-2">
        {displayMatches.map((m) => {
          const games = (allGames ?? [])
            .filter((g) => g.matchId === m.id)
            .sort((a, b) => a.gameIndex - b.gameIndex)
          const expanded = expandedMatchId === m.id
          return (
            <div key={m.id} className="rounded-xl bg-white/5 p-3">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedMatchId(expanded ? null : m.id)}
              >
                <span className="text-sm text-slate-400">
                  {m.date}
                  {m.format && ` ・${m.format}`}
                  {games.length > 0 && ` ・${games.length}ゲーム`}
                </span>
                <span className={'rounded px-2 py-0.5 text-sm font-semibold ' + RESULT_COLOR[m.result]}>
                  {RESULT_LABEL[m.result]}
                </span>
              </button>
              {(m.myDeckId || m.opponentDeckIds.length > 0) && (
                <div className="mt-1 text-sm text-slate-300">
                  {m.myDeckId && deckNames?.[m.myDeckId]}
                  {m.opponentDeckIds.length > 0 && (
                    <span className="text-slate-500">
                      {' '}
                      vs {m.opponentDeckIds.map((id) => deckNames?.[id] ?? '?').join(', ')}
                    </span>
                  )}
                </div>
              )}
              {(m.opponentPlayerIds ?? []).length > 0 && (
                <div className="mt-1 text-xs text-amber-300">
                  対 {(m.opponentPlayerIds ?? []).map((id) => playerNames?.[id] ?? '?').join('・')}
                </div>
              )}
              {m.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.tags.map((t) => (
                    <span key={t} className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {m.note && <div className="mt-1 text-xs text-slate-500">{m.note}</div>}

              {expanded && games.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-white/10 pt-2">
                  {games.map((g) => (
                    <div key={g.id} className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">第{g.gameIndex}ゲーム</span>
                        <span className={g.result ? RESULT_COLOR[g.result] + ' rounded px-1.5' : ''}>
                          {g.result ? RESULT_LABEL[g.result] : ''}
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-400">
                        先手: {g.onThePlay === 'me' ? 'あなた' : g.onThePlay === 'opponent' ? '相手' : '不明'}
                        {' ／ '}
                        マリガン: あなた{g.mulligans.me} 相手{g.mulligans.opponent ?? 0}
                        {g.finalLife && g.finalLife.length > 0 && (
                          <>
                            {' ／ '}
                            ライフ: {g.finalLife.map((f) => `${f.name} ${f.life}`).join(' / ')}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
