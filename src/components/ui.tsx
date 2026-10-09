import type { ComponentChildren } from 'preact'
import type { ComparisonRow, IconComponent, RowRecord, Severity } from '../domain/types'
import { valueToShortText } from '../domain/sqlite'

export function AppShellButton({
  children,
  icon: Icon,
  onClick,
  disabled,
  tone = 'light',
  title,
  className = '',
}: {
  children: ComponentChildren
  icon: IconComponent
  onClick?: () => void
  disabled?: boolean
  tone?: 'light' | 'dark' | 'accent'
  title?: string
  className?: string
}) {
  const toneClass =
    tone === 'dark'
      ? 'border-[#314137] bg-[#17231d] text-white hover:bg-[#20342b]'
      : tone === 'accent'
        ? 'border-teal-700 bg-teal-700 text-white shadow-sm shadow-teal-900/10 hover:bg-teal-800'
        : 'border-[#cfd9cd] bg-white text-[#14211b] shadow-sm shadow-[#14211b]/5 hover:bg-[#f7faf5]'

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      class={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition active:translate-y-px disabled:active:translate-y-0 ${toneClass} ${className}`}
    >
      <Icon class="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </button>
  )
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: IconComponent
  label: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <div class="rounded-lg border border-[#d7ded4] bg-white p-4 shadow-sm shadow-[#14211b]/5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase text-[#5f6f63]">{label}</p>
          <p class="mt-2 text-2xl font-semibold text-[#13231b]">{value}</p>
        </div>
        <div class={`flex h-10 w-10 items-center justify-center rounded-md ${tone}`}>
          <Icon class="h-5 w-5" />
        </div>
      </div>
      <p class="mt-3 min-h-10 text-sm text-[#5d6b61]">{detail}</p>
    </div>
  )
}

export function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: ComponentChildren
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'dark'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-800'
          : tone === 'dark'
            ? 'border-white/10 bg-white/5 text-white'
            : 'border-[#d7ded4] bg-[#f8faf6] text-[#526154]'

  return <span class={`inline-flex min-h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${toneClass}`}>{children}</span>
}

export function PanelTitle({
  icon: Icon,
  title,
  meta,
  action,
}: {
  icon: IconComponent
  title: string
  meta?: string
  action?: ComponentChildren
}) {
  return (
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce4d9] px-4 py-3">
      <div class="flex min-w-0 items-center gap-2">
        <Icon class="h-4 w-4 shrink-0 text-teal-700" />
        <h2 class="truncate text-base font-semibold text-[#14211b]">{title}</h2>
      </div>
      <div class="flex items-center gap-2">
        {meta ? <span class="text-xs font-semibold uppercase text-[#667467]">{meta}</span> : null}
        {action}
      </div>
    </div>
  )
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span class={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${severityClasses(severity)}`}>
      {severity}
    </span>
  )
}

export function StatusBadge({ status }: { status: ComparisonRow['status'] }) {
  return (
    <span class={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClasses(status)}`}>
      {status}
    </span>
  )
}

export function ResultTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: string[]
  rows: RowRecord[]
  emptyLabel: string
}) {
  if (!columns.length) {
    return (
      <div class="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-[#cbd8cf] bg-[#f8faf6] px-4 text-center text-sm text-[#667467]">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div class="overflow-hidden rounded-lg border border-[#d7ded4] bg-white">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1eb] bg-[#fbfcfa] px-3 py-2 text-xs font-semibold uppercase text-[#667467]">
        <span>{rows.length.toLocaleString()} rows</span>
        <span>{columns.length.toLocaleString()} columns</span>
      </div>
      <div class="thin-scrollbar max-h-[560px] overflow-auto">
        <table class="min-w-full border-collapse text-left text-sm">
          <thead class="sticky top-0 z-10 bg-[#eef4ed] text-xs uppercase text-[#516154]">
            <tr>
              {columns.map((column) => (
                <th class="whitespace-nowrap border-b border-[#d7ded4] px-3 py-2 font-semibold" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr class="border-b border-[#edf1eb] odd:bg-white even:bg-[#fbfcfa] hover:bg-teal-50/60 last:border-0" key={`${rowIndex}-${columns[0]}`}>
                {columns.map((column) => (
                  <td class="max-w-[360px] whitespace-nowrap px-3 py-2 font-mono text-xs text-[#253328]" key={column}>
                    {valueToShortText(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <div class="px-4 py-10 text-center text-sm text-[#667467]">{emptyLabel}</div> : null}
    </div>
  )
}

export function EmptyState({ children }: { children: ComponentChildren }) {
  return (
    <div class="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-[#cbd8cf] bg-[#f8faf6] px-4 text-center text-sm text-[#667467]">
      {children}
    </div>
  )
}

export function severityClasses(severity: Severity) {
  if (severity === 'critical') return 'border-red-300 bg-red-50 text-red-800'
  if (severity === 'high') return 'border-orange-300 bg-orange-50 text-orange-800'
  if (severity === 'medium') return 'border-amber-300 bg-amber-50 text-amber-800'
  if (severity === 'low') return 'border-sky-300 bg-sky-50 text-sky-800'
  return 'border-emerald-300 bg-emerald-50 text-emerald-800'
}

function statusClasses(status: ComparisonRow['status']) {
  if (status === 'added') return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  if (status === 'removed') return 'border-red-300 bg-red-50 text-red-800'
  if (status === 'changed') return 'border-amber-300 bg-amber-50 text-amber-800'
  return 'border-slate-300 bg-slate-50 text-slate-700'
}
