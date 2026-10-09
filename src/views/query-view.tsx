import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { Braces, Clock3, Copy, Download, Map, Play, RotateCcw, Table2, Trash2, WandSparkles } from 'lucide-preact'
import type { QueryResult, TableInfo } from '../domain/types'
import { presetQueries } from '../domain/constants'
import { AppShellButton, PanelTitle, ResultTable, StatusPill } from '../components/ui'

type SqlEditorComponent = (props: {
  value: string
  schema: TableInfo[]
  onChange: (value: string) => void
}) => ComponentChildren

export function QueryView({
  query,
  queryResult,
  queryPlan,
  queryError,
  planError,
  queryHistory,
  copyLabel,
  schema,
  onQueryChange,
  onExecute,
  onUseQuery,
  onFormatSql,
  onExplainPlan,
  onCopyCsv,
  onDownloadCsv,
  onClearHistory,
}: {
  query: string
  queryResult: QueryResult | null
  queryPlan: QueryResult | null
  queryError: string
  planError: string
  queryHistory: string[]
  copyLabel: string
  schema: TableInfo[]
  onQueryChange: (query: string) => void
  onExecute: (query?: string) => void
  onUseQuery: (query: string) => void
  onFormatSql: () => void
  onExplainPlan: () => void
  onCopyCsv: () => void
  onDownloadCsv: () => void
  onClearHistory: () => void
}) {
  const [SqlEditor, setSqlEditor] = useState<SqlEditorComponent | null>(null)
  const queryLines = query.trim() ? query.split('\n').length : 0
  const queryChars = query.trim().length

  useEffect(() => {
    let mounted = true
    void import('../components/sql-editor').then((module) => {
      if (mounted) setSqlEditor(() => module.SqlEditor)
    })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div class="rounded-lg border border-[#d7ded4] bg-white">
        <PanelTitle icon={Braces} title="SQL Workspace" meta="runs locally in WASM" />
        <div class="grid gap-3 p-4">
          <div class="flex flex-wrap gap-2">
            <StatusPill>{queryLines.toLocaleString()} lines</StatusPill>
            <StatusPill>{queryChars.toLocaleString()} chars</StatusPill>
            <StatusPill>{schema.length.toLocaleString()} tables</StatusPill>
            <StatusPill tone={queryResult ? 'success' : 'neutral'}>{queryResult ? queryResult.message : 'No result'}</StatusPill>
          </div>
          <div class="rounded-lg border border-[#dfe7dc] bg-[#fbfcfa] p-3">
            <p class="mb-2 text-xs font-semibold uppercase text-[#667467]">Presets</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
              {presetQueries.map((preset) => (
                <button
                  class="min-h-10 rounded-md border border-[#d7ded4] bg-white px-3 py-2 text-sm font-semibold text-[#405044] shadow-sm shadow-[#14211b]/5 hover:border-teal-600 hover:bg-teal-50"
                  type="button"
                  onClick={() => onUseQuery(preset.sql)}
                  key={preset.name}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <div class="rounded-lg border border-[#dfe7dc] bg-[#fbfcfa] p-3">
            <p class="mb-2 text-xs font-semibold uppercase text-[#667467]">Actions</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap [&>button]:w-full lg:[&>button]:w-auto">
              <AppShellButton icon={Play} tone="accent" disabled={!query.trim()} onClick={() => onExecute()}>
                Run query
              </AppShellButton>
              <AppShellButton icon={WandSparkles} disabled={!query.trim()} onClick={onFormatSql}>
                Format SQL
              </AppShellButton>
              <AppShellButton icon={Map} disabled={!query.trim()} onClick={onExplainPlan}>
                Explain plan
              </AppShellButton>
              <AppShellButton icon={Copy} disabled={!queryResult} onClick={onCopyCsv}>
                {copyLabel}
              </AppShellButton>
              <AppShellButton icon={Download} disabled={!queryResult} onClick={onDownloadCsv}>
                Download CSV
              </AppShellButton>
            </div>
          </div>
          {SqlEditor ? (
            <SqlEditor value={query} schema={schema} onChange={onQueryChange} />
          ) : (
            <textarea
              class="thin-scrollbar min-h-[360px] rounded-lg border border-[#17231d] bg-[#101712] p-4 font-mono text-sm leading-6 text-[#d8eadf] outline-none"
              spellcheck={false}
              value={query}
              onInput={(event) => onQueryChange((event.currentTarget as HTMLTextAreaElement).value)}
            />
          )}
          {queryError ? (
            <div class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <RotateCcw class="mt-0.5 h-4 w-4 shrink-0" />
              <span>{queryError}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div class="grid gap-4">
        <div class="rounded-lg border border-[#d7ded4] bg-white">
          <PanelTitle icon={Table2} title="Query Result" meta={queryResult ? `${queryResult.durationMs.toFixed(1)} ms / ${queryResult.changedRows} changed` : 'idle'} />
          <div class="p-4">
            {queryResult ? (
              <>
                <div class="mb-3 flex flex-wrap gap-2 text-sm">
                  <span class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">{queryResult.message}</span>
                  <span class="rounded-md border border-[#d7ded4] bg-[#f8faf6] px-3 py-2 text-[#5d6b61]">{queryResult.columns.length} columns</span>
                </div>
                <ResultTable columns={queryResult.columns} rows={queryResult.rows} emptyLabel="Statement returned no rows." />
              </>
            ) : (
              <ResultTable columns={[]} rows={[]} emptyLabel="Run a query to inspect result rows." />
            )}
          </div>
        </div>

        <div class="rounded-lg border border-[#d7ded4] bg-white">
          <PanelTitle icon={Map} title="Explain Query Plan" meta={queryPlan ? `${queryPlan.rows.length} steps` : 'not run'} />
          <div class="p-4">
            {planError ? (
              <div class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{planError}</div>
            ) : null}
            {queryPlan ? (
              <ResultTable columns={queryPlan.columns} rows={queryPlan.rows} emptyLabel="SQLite returned an empty plan." />
            ) : (
              <ResultTable columns={[]} rows={[]} emptyLabel="Run Explain plan to inspect SQLite's query strategy." />
            )}
          </div>
        </div>

        <div class="rounded-lg border border-[#d7ded4] bg-white">
          <PanelTitle
            icon={Clock3}
            title="Query History"
            meta={`${queryHistory.length} saved`}
            action={
              queryHistory.length ? (
                <button class="inline-flex h-8 items-center gap-1 rounded-md border border-[#d7ded4] px-2 text-xs font-semibold text-[#516154] hover:bg-[#f8faf6]" type="button" onClick={onClearHistory}>
                  <Trash2 class="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null
            }
          />
          <div class="grid gap-2 p-3">
            {queryHistory.map((historyQuery, index) => (
              <button
                type="button"
                class="rounded-lg border border-[#e0e7dd] bg-[#fbfcfa] p-3 text-left transition hover:border-teal-600 hover:bg-teal-50"
                onClick={() => onUseQuery(historyQuery)}
                key={`${index}-${historyQuery.slice(0, 16)}`}
              >
                <p class="line-clamp-2 font-mono text-xs text-[#233128]">{historyQuery}</p>
              </button>
            ))}
            {queryHistory.length === 0 ? <p class="px-2 py-4 text-sm text-[#667467]">Executed queries will appear here for quick replay.</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
