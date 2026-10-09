import { Braces, CheckCircle2, Eye, Search } from 'lucide-preact'
import type { ColumnProfile, RowRecord, TableInfo } from '../domain/types'
import { AppShellButton, PanelTitle, ResultTable } from '../components/ui'

export function DataView({
  schema,
  selectedTableInfo,
  tableRows,
  tableFilter,
  previewError,
  columnProfiles,
  onSelectTable,
  onTableFilterChange,
  onRunTableQuery,
}: {
  schema: TableInfo[]
  selectedTableInfo?: TableInfo
  tableRows: RowRecord[]
  tableFilter: string
  previewError: string
  columnProfiles: ColumnProfile[]
  onSelectTable: (table: string) => void
  onTableFilterChange: (filter: string) => void
  onRunTableQuery: (table: string) => void
}) {
  const tableColumns = selectedTableInfo?.columns.map((column) => column.name) ?? []

  return (
    <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div class="rounded-lg border border-[#d7ded4] bg-white">
        <PanelTitle
          icon={Eye}
          title={selectedTableInfo?.name ? `Data Preview: ${selectedTableInfo.name}` : 'Data Preview'}
          meta={selectedTableInfo ? `${tableRows.length.toLocaleString()} visible / ${selectedTableInfo.rowCount.toLocaleString()} rows` : 'idle'}
        />
        <div class="grid gap-3 border-b border-[#edf1eb] p-4 lg:grid-cols-[280px_1fr_auto] lg:items-center">
          <select class="min-h-10 rounded-md border border-[#cfd9cd] bg-white px-3 text-sm" value={selectedTableInfo?.name ?? ''} onInput={(event) => onSelectTable((event.currentTarget as HTMLSelectElement).value)}>
            {schema.map((table) => (
              <option value={table.name} key={table.name}>{table.name}</option>
            ))}
          </select>
          <label class="flex min-h-10 items-center gap-2 rounded-md border border-[#d1dbd2] bg-[#f8faf6] px-3">
            <Search class="h-4 w-4 text-[#68796a]" />
            <input class="min-w-0 flex-1 bg-transparent text-sm outline-none" value={tableFilter} onInput={(event) => onTableFilterChange((event.currentTarget as HTMLInputElement).value)} placeholder="Search visible row values" />
          </label>
          <AppShellButton icon={Braces} onClick={() => selectedTableInfo && onRunTableQuery(selectedTableInfo.name)} disabled={!selectedTableInfo}>
            Query table
          </AppShellButton>
        </div>
        <div class="p-4">
          {previewError ? <div class="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{previewError}</div> : null}
          <ResultTable columns={tableColumns} rows={tableRows} emptyLabel="No matching rows." />
        </div>
      </div>

      <div class="rounded-lg border border-[#d7ded4] bg-white">
        <PanelTitle icon={CheckCircle2} title="Column Profiler" meta={`${columnProfiles.length} columns`} />
        <div class="thin-scrollbar max-h-[820px] overflow-auto p-3">
          <div class="grid gap-3">
            {columnProfiles.map((profile) => (
              <div class="rounded-lg border border-[#e0e7dd] bg-[#fbfcfa] p-3" key={profile.name}>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-mono text-sm font-semibold text-[#14211b]">{profile.name}</p>
                    <p class="mt-1 text-xs text-[#667467]">{profile.type}</p>
                  </div>
                  <span class={`rounded-md border px-2 py-1 text-xs font-semibold ${profile.completeness >= 95 ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                    {profile.completeness.toFixed(0)}%
                  </span>
                </div>
                <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <MiniStat label="Null" value={profile.nullCount.toLocaleString()} />
                  <MiniStat label="Empty" value={profile.emptyCount.toLocaleString()} />
                  <MiniStat label="Distinct" value={profile.distinctCount.toLocaleString()} />
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-[#e3eae0]">
                  <div class="h-full rounded-full bg-teal-700" style={{ width: `${Math.max(4, profile.completeness)}%` }} />
                </div>
                <div class="mt-3 flex flex-wrap gap-1">
                  {profile.sensitive ? <span class="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">sensitive</span> : null}
                  {profile.timestampLike ? <span class="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">timestamp</span> : null}
                  {!profile.sensitive && !profile.timestampLike ? <span class="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">general</span> : null}
                </div>
                {profile.sampleValues.length ? (
                  <div class="mt-3 rounded-md bg-white px-3 py-2 font-mono text-xs text-[#59665d]">
                    {profile.sampleValues.join(' / ')}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div class="rounded-md border border-[#e0e7dd] bg-white px-2 py-2">
      <p class="font-semibold text-[#14211b]">{value}</p>
      <p class="mt-1 uppercase text-[#6c786e]">{label}</p>
    </div>
  )
}
