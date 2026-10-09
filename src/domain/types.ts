import type { ComponentChildren } from 'preact'
import type { SqlValue } from 'sql.js'

export type IconComponent = (props: { class?: string; size?: number; strokeWidth?: number }) => ComponentChildren
export type ViewMode = 'overview' | 'data' | 'query' | 'forensics' | 'timeline' | 'relations' | 'diff'
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type RowRecord = Record<string, SqlValue>

export type ColumnInfo = {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: SqlValue
  pk: number
}

export type IndexInfo = {
  name: string
  unique: number
  origin: string
  partial: number
}

export type ForeignKeyInfo = {
  id: number
  seq: number
  table: string
  from: string
  to: string
  on_update: string
  on_delete: string
  match: string
}

export type TableInfo = {
  name: string
  sql: string
  rowCount: number
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  foreignKeys: ForeignKeyInfo[]
}

export type Finding = {
  id: string
  severity: Severity
  table: string
  title: string
  detail: string
  evidence: string
}

export type TimelineEvent = {
  id: string
  table: string
  column: string
  rowid: string
  value: string
  date: Date
}

export type ForensicReport = {
  findings: Finding[]
  timeline: TimelineEvent[]
  piiColumns: number
  missingValues: number
  orphanRecords: number
  sensitiveHits: number
}

export type QueryResult = {
  columns: string[]
  rows: RowRecord[]
  durationMs: number
  changedRows: number
  message: string
}

export type ComparisonRow = {
  table: string
  status: 'added' | 'removed' | 'changed' | 'unchanged'
  currentRows: number
  comparisonRows: number
  currentColumns: number
  comparisonColumns: number
  detail: string
}

export type RelationEdge = {
  from: string
  to: string
  label: string
}

export type TimelineBucket = {
  day: string
  count: number
}

export type ColumnProfile = {
  name: string
  type: string
  nullCount: number
  emptyCount: number
  distinctCount: number
  completeness: number
  sampleValues: string[]
  sensitive: boolean
  timestampLike: boolean
}

export type DatabaseHealth = {
  integrity: string
  foreignKeyIssues: number
  pageCount: number
  pageSize: number
  freelistCount: number
  encoding: string
  objectCount: number
}
