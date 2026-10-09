import { Clock3, Layers3, ShieldAlert, Table2 } from 'lucide-preact'
import type { ComparisonRow, ForensicReport, TableInfo } from '../domain/types'
import { MetricCard } from './ui'

export function MetricStrip({
  schema,
  totalRows,
  forensicReport,
  comparisonRows,
  hasComparison,
}: {
  schema: TableInfo[]
  totalRows: number
  forensicReport: ForensicReport
  comparisonRows: ComparisonRow[]
  hasComparison: boolean
}) {
  const changedSnapshots = comparisonRows.filter((row) => row.status !== 'unchanged').length

  return (
    <section class="forensic-grid border-b border-[#d7ded4]">
      <div class="mx-auto grid max-w-[1560px] gap-3 px-4 py-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <MetricCard icon={Table2} label="Schema" value={`${schema.length}`} detail={`${totalRows.toLocaleString()} rows across loaded tables`} tone="bg-teal-50 text-teal-800" />
        <MetricCard icon={ShieldAlert} label="Findings" value={`${forensicReport.findings.length}`} detail={`${forensicReport.piiColumns} sensitive columns, ${forensicReport.sensitiveHits} sampled hits`} tone="bg-orange-50 text-orange-800" />
        <MetricCard icon={Clock3} label="Timeline" value={`${forensicReport.timeline.length}`} detail="Timestamp-like values extracted from schema columns" tone="bg-sky-50 text-sky-800" />
        <MetricCard icon={Layers3} label="Snapshot Drift" value={`${changedSnapshots}`} detail={hasComparison ? `${comparisonRows.length} tables compared` : 'Load a comparison snapshot'} tone="bg-violet-50 text-violet-800" />
      </div>
    </section>
  )
}
