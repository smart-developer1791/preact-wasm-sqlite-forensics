import { useMemo, useState } from 'preact/hooks'
import Fuse from 'fuse.js'
import { Activity, Braces, Database as DatabaseIcon, Filter, KeyRound, Link2, Search, ShieldAlert, Table2 } from 'lucide-preact'
import type { DatabaseHealth, ForensicReport, Severity, TableInfo } from '../domain/types'
import { isPiiLikeColumn } from '../domain/sqlite'
import { formatBytes } from '../domain/export'
import { AppShellButton, MetricCard, PanelTitle, SeverityBadge, StatusPill } from '../components/ui'

export function OverviewView({
  schema,
  selectedTableInfo,
  forensicReport,
  health,
  onSelectTable,
  onRunTableQuery,
}: {
  schema: TableInfo[]
  selectedTableInfo?: TableInfo
  forensicReport: ForensicReport
  health: DatabaseHealth | null
  onSelectTable: (table: string) => void
  onRunTableQuery: (table: string) => void
}) {
  const [schemaFilter, setSchemaFilter] = useState('')
  const filteredTables = useMemo(() => {
    const term = schemaFilter.trim()
    if (!term) return schema

    return new Fuse(schema, {
      keys: ['name', 'columns.name', 'columns.type'],
      threshold: 0.34,
      ignoreLocation: true,
    })
      .search(term)
      .map((result) => result.item)
  }, [schema, schemaFilter])
  const severityBreakdown = useMemo(() => {
    const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
    return order.map((severity) => ({
      severity,
      count: forensicReport.findings.filter((finding) => finding.severity === severity).length,
    }))
  }, [forensicReport.findings])

  return (
    <section class="grid gap-4 xl:grid-cols-[390px_1fr]">
      <div class="rounded-lg border border-[#d7ded4] bg-white">
        <PanelTitle icon={DatabaseIcon} title="Schema Atlas" meta={`${filteredTables.length} tables`} />
        <div class="border-b border-[#edf1eb] p-3">
          <label class="flex min-h-10 items-center gap-2 rounded-md border border-[#d1dbd2] bg-[#f8faf6] px-3">
            <Search class="h-4 w-4 text-[#68796a]" />
            <input
              class="min-w-0 flex-1 bg-transparent text-sm outline-none"
              value={schemaFilter}
              onInput={(event) => setSchemaFilter((event.currentTarget as HTMLInputElement).value)}
              placeholder="Fuzzy search tables or columns"
            />
          </label>
        </div>
        <div class="thin-scrollbar max-h-[680px] overflow-auto p-2">
          {filteredTables.map((table) => {
            const active = table.name === selectedTableInfo?.name
            const tableFindings = forensicReport.findings.filter((finding) => finding.table === table.name)
            return (
              <button
                type="button"
                class={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                  active ? 'border-teal-700 bg-teal-50' : 'border-[#e0e7dd] bg-white hover:bg-[#f8faf6]'
                }`}
                onClick={() => onSelectTable(table.name)}
                key={table.name}
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-[#14211b]">{table.name}</p>
                    <p class="mt-1 text-xs text-[#647066]">
                      {table.rowCount.toLocaleString()} rows / {table.columns.length} columns
                    </p>
                  </div>
                  <span class={`rounded-md border px-2 py-1 text-xs font-semibold ${tableFindings.length ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
                    {tableFindings.length || 'ok'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div class="grid gap-4">
        <div class="rounded-lg border border-[#d7ded4] bg-white">
          <PanelTitle
            icon={Table2}
            title={selectedTableInfo?.name ?? 'No table'}
            meta="table inspector"
            action={
              selectedTableInfo ? (
                <AppShellButton icon={Braces} onClick={() => onRunTableQuery(selectedTableInfo.name)}>
                  Query rows
                </AppShellButton>
              ) : null
            }
          />
          {selectedTableInfo ? (
            <div class="grid gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div class="mb-3 flex flex-wrap gap-2">
                  <StatusPill>{selectedTableInfo.rowCount.toLocaleString()} rows</StatusPill>
                  <StatusPill>{selectedTableInfo.columns.length.toLocaleString()} columns</StatusPill>
                  <StatusPill>{selectedTableInfo.indexes.length.toLocaleString()} indexes</StatusPill>
                  <StatusPill tone={selectedTableInfo.foreignKeys.length ? 'success' : 'neutral'}>
                    {selectedTableInfo.foreignKeys.length.toLocaleString()} relations
                  </StatusPill>
                </div>
                <div class="grid gap-3 sm:grid-cols-3">
                  <MetricCard icon={Activity} label="Rows" value={selectedTableInfo.rowCount.toLocaleString()} detail="Live count from SQLite" tone="bg-emerald-50 text-emerald-800" />
                  <MetricCard icon={KeyRound} label="Keys" value={`${selectedTableInfo.columns.filter((column) => column.pk).length}`} detail={`${selectedTableInfo.foreignKeys.length} foreign keys`} tone="bg-amber-50 text-amber-800" />
                  <MetricCard icon={Filter} label="Indexes" value={`${selectedTableInfo.indexes.length}`} detail="Secondary and unique indexes" tone="bg-sky-50 text-sky-800" />
                </div>

                <div class="mt-4 overflow-hidden rounded-lg border border-[#d7ded4]">
                  <table class="min-w-full text-left text-sm">
                    <thead class="bg-[#eef4ed] text-xs uppercase text-[#516154]">
                      <tr>
                        <th class="px-3 py-2">Column</th>
                        <th class="px-3 py-2">Type</th>
                        <th class="px-3 py-2">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTableInfo.columns.map((column) => (
                        <tr class="border-t border-[#edf1eb]" key={column.name}>
                          <td class="px-3 py-2 font-mono text-xs">{column.name}</td>
                          <td class="px-3 py-2 text-[#5d6b61]">{column.type || 'untyped'}</td>
                          <td class="px-3 py-2">
                            <div class="flex flex-wrap gap-1">
                              {column.pk ? <span class="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">pk</span> : null}
                              {column.notnull ? <span class="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">not null</span> : null}
                              {isPiiLikeColumn(column.name) ? <span class="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">sensitive</span> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="grid gap-4">
                <div class="rounded-lg border border-[#d7ded4] bg-[#f8faf6] p-4">
                  <div class="flex items-center gap-2">
                    <Link2 class="h-4 w-4 text-teal-700" />
                    <h3 class="font-semibold">Relations</h3>
                  </div>
                  <div class="mt-3 grid gap-2 text-sm">
                    {selectedTableInfo.foreignKeys.length ? (
                      selectedTableInfo.foreignKeys.map((foreignKey) => (
                        <div class="rounded-md border border-[#d7ded4] bg-white px-3 py-2" key={`${foreignKey.from}-${foreignKey.table}`}>
                          <span class="font-mono text-xs">{foreignKey.from}</span>
                          <span class="px-2 text-[#6d796e]">{'->'}</span>
                          <span class="font-mono text-xs">{foreignKey.table}.{foreignKey.to || 'pk'}</span>
                        </div>
                      ))
                    ) : (
                      <p class="text-sm text-[#667467]">No declared foreign keys.</p>
                    )}
                  </div>
                </div>

                <div class="rounded-lg border border-[#d7ded4] bg-[#111a15] p-4 text-white">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <Braces class="h-4 w-4 text-teal-200" />
                      <h3 class="font-semibold">DDL</h3>
                    </div>
                    <button class="rounded-md border border-white/15 px-2 py-1 text-xs font-semibold" type="button" onClick={() => onRunTableQuery(selectedTableInfo.name)}>
                      Query rows
                    </button>
                  </div>
                  <pre class="thin-scrollbar mt-3 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-xs text-[#c9d8ce]">{selectedTableInfo.sql}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div class="p-8 text-center text-sm text-[#667467]">No SQLite tables found.</div>
          )}
        </div>

        <div class="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div class="rounded-lg border border-[#d7ded4] bg-white">
            <PanelTitle icon={ShieldAlert} title="Top Findings" meta={`${forensicReport.findings.length} total`} />
            <div class="flex flex-wrap gap-2 px-4 pt-4">
              {severityBreakdown.map((item) => (
                <StatusPill tone={item.count ? (item.severity === 'critical' || item.severity === 'high' ? 'danger' : 'warning') : 'success'} key={item.severity}>
                  {item.severity}: {item.count.toLocaleString()}
                </StatusPill>
              ))}
            </div>
            <div class="grid gap-2 p-4 md:grid-cols-2">
              {forensicReport.findings.slice(0, 6).map((finding) => (
                <div class="rounded-lg border border-[#e0e7dd] p-3" key={finding.id}>
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-semibold text-[#14211b]">{finding.title}</p>
                      <p class="mt-1 text-sm text-[#5d6b61]">{finding.detail}</p>
                    </div>
                    <SeverityBadge severity={finding.severity} />
                  </div>
                  <p class="mt-3 font-mono text-xs text-[#738075]">{finding.table} / {finding.evidence}</p>
                </div>
              ))}
              {forensicReport.findings.length === 0 ? <p class="p-4 text-sm text-[#667467]">No findings in the loaded database.</p> : null}
            </div>
          </div>

          <div class="rounded-lg border border-[#d7ded4] bg-white">
            <PanelTitle icon={Activity} title="Database Health" meta={health?.integrity ?? 'idle'} />
            <div class="grid gap-3 p-4 text-sm">
              {health ? (
                <>
                  <HealthRow label="Integrity" value={health.integrity} strong={health.integrity === 'ok'} />
                  <HealthRow label="FK issues" value={health.foreignKeyIssues.toLocaleString()} strong={health.foreignKeyIssues === 0} />
                  <HealthRow label="Objects" value={health.objectCount.toLocaleString()} />
                  <HealthRow label="Pages" value={`${health.pageCount.toLocaleString()} x ${formatBytes(health.pageSize)}`} />
                  <HealthRow label="Freelist" value={health.freelistCount.toLocaleString()} strong={health.freelistCount === 0} />
                  <HealthRow label="Encoding" value={health.encoding} />
                </>
              ) : (
                <p class="text-[#667467]">Load a database to inspect SQLite health pragmas.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HealthRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div class="flex items-center justify-between gap-3 rounded-md border border-[#e0e7dd] bg-[#f8faf6] px-3 py-2">
      <span class="text-[#627166]">{label}</span>
      <span class={`font-mono text-xs font-semibold ${strong ? 'text-emerald-700' : 'text-[#14211b]'}`}>{value}</span>
    </div>
  )
}
