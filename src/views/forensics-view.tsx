import { useMemo, useState } from 'preact/hooks'
import Fuse from 'fuse.js'
import { AlertTriangle, Download, Search, ShieldAlert } from 'lucide-preact'
import type { ForensicReport, Severity, TableInfo } from '../domain/types'
import { AppShellButton, PanelTitle, SeverityBadge } from '../components/ui'

const severities: Array<Severity | 'all'> = ['all', 'critical', 'high', 'medium', 'low', 'info']

export function ForensicsView({
  forensicReport,
  schema,
  onExportReport,
}: {
  forensicReport: ForensicReport
  schema: TableInfo[]
  onExportReport: () => void
}) {
  const [severity, setSeverity] = useState<Severity | 'all'>('all')
  const [table, setTable] = useState('all')
  const [search, setSearch] = useState('')
  const severityCounts = useMemo(
    () =>
      severities.reduce(
        (counts, item) => ({
          ...counts,
          [item]: item === 'all' ? forensicReport.findings.length : forensicReport.findings.filter((finding) => finding.severity === item).length,
        }),
        {} as Record<Severity | 'all', number>,
      ),
    [forensicReport.findings],
  )
  const filteredFindings = useMemo(() => {
    const term = search.trim()
    const base = forensicReport.findings.filter((finding) => {
      const matchesSeverity = severity === 'all' || finding.severity === severity
      const matchesTable = table === 'all' || finding.table === table

      return matchesSeverity && matchesTable
    })

    if (!term) return base

    return new Fuse(base, {
      keys: ['title', 'detail', 'evidence', 'table', 'severity'],
      threshold: 0.34,
      ignoreLocation: true,
    })
      .search(term)
      .map((result) => result.item)
  }, [forensicReport.findings, search, severity, table])

  return (
    <section class="rounded-lg border border-[#d7ded4] bg-white">
      <PanelTitle
        icon={ShieldAlert}
        title="Forensic Findings"
        meta={`${filteredFindings.length} visible / ${forensicReport.findings.length} total`}
        action={<AppShellButton icon={Download} onClick={onExportReport}>Export JSON</AppShellButton>}
      />
      <div class="grid gap-3 border-b border-[#edf1eb] p-4 lg:grid-cols-[1fr_220px]">
        <label class="flex min-h-10 items-center gap-2 rounded-md border border-[#d1dbd2] bg-[#f8faf6] px-3">
          <Search class="h-4 w-4 text-[#68796a]" />
          <input
            class="min-w-0 flex-1 bg-transparent text-sm outline-none"
            value={search}
            onInput={(event) => setSearch((event.currentTarget as HTMLInputElement).value)}
            placeholder="Fuzzy search findings"
          />
        </label>
        <select class="min-h-10 rounded-md border border-[#cfd9cd] bg-white px-3 text-sm" value={table} onInput={(event) => setTable((event.currentTarget as HTMLSelectElement).value)}>
          <option value="all">all tables</option>
          {schema.map((item) => (
            <option value={item.name} key={item.name}>{item.name}</option>
          ))}
        </select>
        <div class="flex flex-wrap gap-2 lg:col-span-2">
          {severities.map((item) => {
            const active = severity === item
            return (
              <button
                type="button"
                class={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold uppercase transition ${
                  active
                    ? 'border-[#123026] bg-[#123026] text-white'
                    : 'border-[#d7ded4] bg-[#f8faf6] text-[#526154] hover:border-teal-600 hover:bg-teal-50'
                }`}
                onClick={() => setSeverity(item)}
                key={item}
              >
                <span>{item}</span>
                <span class={`rounded px-1.5 py-0.5 ${active ? 'bg-white/15 text-white' : 'bg-white text-[#667467]'}`}>
                  {severityCounts[item].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div class="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredFindings.map((finding) => (
          <div class="rounded-lg border border-[#e0e7dd] bg-white p-4" key={finding.id}>
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2">
                <AlertTriangle class="mt-1 h-4 w-4 shrink-0 text-orange-600" />
                <div>
                  <p class="font-semibold text-[#14211b]">{finding.title}</p>
                  <p class="mt-1 text-sm text-[#5d6b61]">{finding.detail}</p>
                </div>
              </div>
              <SeverityBadge severity={finding.severity} />
            </div>
            <div class="mt-4 rounded-md bg-[#f8faf6] px-3 py-2 font-mono text-xs text-[#657267]">
              {finding.table} / {finding.evidence}
            </div>
          </div>
        ))}
        {filteredFindings.length === 0 ? <p class="p-4 text-sm text-[#667467]">No findings match the current filters.</p> : null}
      </div>
    </section>
  )
}
