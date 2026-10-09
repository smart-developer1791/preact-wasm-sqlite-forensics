import { Layers3, RefreshCw, Upload } from 'lucide-preact'
import type { ComparisonRow } from '../domain/types'
import { AppShellButton, EmptyState, PanelTitle, StatusBadge, StatusPill } from '../components/ui'

export function DiffView({
  comparisonRows,
  hasComparison,
  sqlReady,
  onLoadComparisonSample,
  onOpenComparison,
}: {
  comparisonRows: ComparisonRow[]
  hasComparison: boolean
  sqlReady: boolean
  onLoadComparisonSample: () => void
  onOpenComparison: (event: Event) => void
}) {
  const changedCount = comparisonRows.filter((row) => row.status === 'changed').length
  const addedCount = comparisonRows.filter((row) => row.status === 'added').length
  const removedCount = comparisonRows.filter((row) => row.status === 'removed').length
  const unchangedCount = comparisonRows.filter((row) => row.status === 'unchanged').length

  return (
    <section class="rounded-lg border border-[#d7ded4] bg-white">
      <PanelTitle icon={Layers3} title="Snapshot Diff" meta={hasComparison ? `${comparisonRows.length} tables` : 'comparison required'} />
      <div class="flex flex-wrap gap-2 border-b border-[#edf1eb] p-4">
        <AppShellButton icon={RefreshCw} disabled={!sqlReady} onClick={onLoadComparisonSample}>
          Load comparison sample
        </AppShellButton>
        <label class="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#cfd9cd] bg-white px-3 text-sm font-semibold text-[#14211b] transition hover:bg-[#f7faf5]">
          <Upload class="h-4 w-4" />
          <span>Open comparison DB</span>
          <input class="sr-only" type="file" accept=".sqlite,.sqlite3,.db,.database" onInput={onOpenComparison} />
        </label>
      </div>
      <div class="p-4">
        {hasComparison ? (
          <div class="grid gap-3">
            <div class="flex flex-wrap gap-2">
              <StatusPill tone={changedCount ? 'warning' : 'success'}>changed: {changedCount.toLocaleString()}</StatusPill>
              <StatusPill tone={addedCount ? 'success' : 'neutral'}>added: {addedCount.toLocaleString()}</StatusPill>
              <StatusPill tone={removedCount ? 'danger' : 'neutral'}>removed: {removedCount.toLocaleString()}</StatusPill>
              <StatusPill>unchanged: {unchangedCount.toLocaleString()}</StatusPill>
            </div>
            <div class="thin-scrollbar overflow-auto rounded-lg border border-[#d7ded4]">
              <table class="min-w-full text-left text-sm">
                <thead class="bg-[#eef4ed] text-xs uppercase text-[#516154]">
                  <tr>
                    <th class="px-3 py-2">Table</th>
                    <th class="px-3 py-2">Status</th>
                    <th class="px-3 py-2">Rows</th>
                    <th class="px-3 py-2">Columns</th>
                    <th class="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr class="border-t border-[#edf1eb] odd:bg-white even:bg-[#fbfcfa] hover:bg-teal-50/60" key={row.table}>
                      <td class="px-3 py-2 font-semibold">{row.table}</td>
                      <td class="px-3 py-2"><StatusBadge status={row.status} /></td>
                      <td class="px-3 py-2 font-mono text-xs">{row.currentRows.toLocaleString()} {'->'} {row.comparisonRows.toLocaleString()}</td>
                      <td class="px-3 py-2 font-mono text-xs">{row.currentColumns} {'->'} {row.comparisonColumns}</td>
                      <td class="px-3 py-2 text-[#5d6b61]">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState>Load a comparison snapshot to inspect schema and row-count drift.</EmptyState>
        )}
      </div>
    </section>
  )
}
