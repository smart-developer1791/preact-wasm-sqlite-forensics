import { Network } from 'lucide-preact'
import type { RelationEdge, TableInfo } from '../domain/types'
import { PanelTitle, StatusPill } from '../components/ui'

export function RelationsView({
  schema,
  selectedTableName,
  relationEdges,
  onSelectTable,
}: {
  schema: TableInfo[]
  selectedTableName?: string
  relationEdges: RelationEdge[]
  onSelectTable: (table: string) => void
}) {
  return (
    <section class="rounded-lg border border-[#d7ded4] bg-white">
      <PanelTitle icon={Network} title="Relation Graph" meta={`${relationEdges.length} edges`} />
      <div class="flex flex-wrap gap-2 border-b border-[#edf1eb] px-4 py-3">
        <StatusPill>{schema.length.toLocaleString()} tables</StatusPill>
        <StatusPill tone={relationEdges.length ? 'success' : 'neutral'}>{relationEdges.length.toLocaleString()} relations</StatusPill>
        {selectedTableName ? <StatusPill>selected: {selectedTableName}</StatusPill> : null}
      </div>
      <div class="thin-scrollbar overflow-auto p-4">
        <svg class="min-h-[520px] min-w-[920px] rounded-lg border border-[#d7ded4] bg-[#fbfcfa]" viewBox="0 0 920 520" role="img" aria-label="SQLite relation graph">
          {relationEdges.map((edge, index) => {
            const fromIndex = schema.findIndex((table) => table.name === edge.from)
            const toIndex = schema.findIndex((table) => table.name === edge.to)
            const fromX = 120 + (fromIndex % 3) * 310
            const fromY = 80 + Math.floor(fromIndex / 3) * 130
            const toX = 120 + (toIndex % 3) * 310
            const toY = 80 + Math.floor(toIndex / 3) * 130
            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <line x1={fromX + 90} y1={fromY + 26} x2={toX + 90} y2={toY + 26} stroke="#0f766e" stroke-width="2" stroke-opacity="0.45" />
                <text x={(fromX + toX) / 2 + 70} y={(fromY + toY) / 2 + 18} fill="#516154" font-size="11">{edge.label}</text>
              </g>
            )
          })}
          {schema.map((table, index) => {
            const x = 120 + (index % 3) * 310
            const y = 80 + Math.floor(index / 3) * 130
            const selected = table.name === selectedTableName
            return (
              <g key={table.name} onClick={() => onSelectTable(table.name)} class="cursor-pointer">
                <rect x={x} y={y} width="180" height="72" rx="8" fill={selected ? '#ccfbf1' : '#ffffff'} stroke={selected ? '#0f766e' : '#cbd8cf'} stroke-width="2" />
                <text x={x + 14} y={y + 28} fill="#14211b" font-size="14" font-weight="700">{table.name}</text>
                <text x={x + 14} y={y + 52} fill="#627166" font-size="12">{table.rowCount.toLocaleString()} rows / {table.columns.length} cols</text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
