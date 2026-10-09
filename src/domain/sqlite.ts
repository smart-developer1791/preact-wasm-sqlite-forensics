import type { Database, QueryExecResult, SqlValue } from 'sql.js'
import type { ColumnInfo, ColumnProfile, DatabaseHealth, ForeignKeyInfo, IndexInfo, RowRecord, TableInfo } from './types'

export function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

export function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

export function valueToText(value: SqlValue) {
  if (value === null) return 'NULL'
  if (value instanceof Uint8Array) return `[blob ${value.byteLength} bytes]`
  return String(value)
}

export function valueToShortText(value: SqlValue) {
  const text = valueToText(value)
  return text.length > 90 ? `${text.slice(0, 87)}...` : text
}

export function rowsFromResult(result?: QueryExecResult): RowRecord[] {
  if (!result) return []
  return result.values.map((values) => {
    const row: RowRecord = {}
    result.columns.forEach((column, index) => {
      row[column] = values[index] ?? null
    })
    return row
  })
}

export function scalarNumber(database: Database, sql: string) {
  const value = database.exec(sql)[0]?.values[0]?.[0]
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function scalarText(database: Database, sql: string) {
  return valueToText(database.exec(sql)[0]?.values[0]?.[0] ?? null)
}

function toColumnInfo(row: RowRecord): ColumnInfo {
  return {
    cid: Number(row.cid ?? 0),
    name: String(row.name ?? ''),
    type: String(row.type ?? ''),
    notnull: Number(row.notnull ?? 0),
    dflt_value: row.dflt_value ?? null,
    pk: Number(row.pk ?? 0),
  }
}

function toIndexInfo(row: RowRecord): IndexInfo {
  return {
    name: String(row.name ?? ''),
    unique: Number(row.unique ?? 0),
    origin: String(row.origin ?? ''),
    partial: Number(row.partial ?? 0),
  }
}

function toForeignKeyInfo(row: RowRecord): ForeignKeyInfo {
  return {
    id: Number(row.id ?? 0),
    seq: Number(row.seq ?? 0),
    table: String(row.table ?? ''),
    from: String(row.from ?? ''),
    to: String(row.to ?? ''),
    on_update: String(row.on_update ?? ''),
    on_delete: String(row.on_delete ?? ''),
    match: String(row.match ?? ''),
  }
}

export function inspectSchema(database: Database): TableInfo[] {
  const rows = rowsFromResult(
    database.exec(`SELECT name, sql
FROM sqlite_master
WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;`)[0],
  )

  return rows.map((row) => {
    const name = String(row.name)
    const columns = rowsFromResult(database.exec(`PRAGMA table_info(${quoteIdentifier(name)});`)[0]).map(toColumnInfo)
    const indexes = rowsFromResult(database.exec(`PRAGMA index_list(${quoteIdentifier(name)});`)[0]).map(toIndexInfo)
    const foreignKeys = rowsFromResult(database.exec(`PRAGMA foreign_key_list(${quoteIdentifier(name)});`)[0]).map(toForeignKeyInfo)

    return {
      name,
      sql: String(row.sql ?? ''),
      rowCount: scalarNumber(database, `SELECT COUNT(*) FROM ${quoteIdentifier(name)};`),
      columns,
      indexes,
      foreignKeys,
    }
  })
}

export function isTextLike(column: ColumnInfo) {
  const type = column.type.toLowerCase()
  return !type || type.includes('char') || type.includes('clob') || type.includes('text') || type.includes('json')
}

export function isPiiLikeColumn(name: string) {
  return /(email|phone|ssn|passport|token|secret|password|credential|api[_-]?key|ip[_-]?address|address|card|hash)/i.test(name)
}

export function isTimestampLikeColumn(name: string) {
  return /(date|time|created|updated|deleted|login|seen|started|ended|applied)/i.test(name)
}

export function parsePossibleDate(value: SqlValue) {
  if (value === null || value instanceof Uint8Array) return null
  const raw = String(value).trim()
  if (!raw) return null

  if (/^\d{13}$/.test(raw)) {
    const date = new Date(Number(raw))
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (/^\d{10}$/.test(raw)) {
    const date = new Date(Number(raw) * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function profileTable(database: Database | null, table?: TableInfo): ColumnProfile[] {
  if (!database || !table) return []

  return table.columns.map((column) => {
    const tableName = quoteIdentifier(table.name)
    const columnName = quoteIdentifier(column.name)
    let nullCount = 0
    let emptyCount = 0
    let distinctCount = 0
    let sampleValues: string[] = []

    try {
      nullCount = scalarNumber(database, `SELECT COUNT(*) FROM ${tableName} WHERE ${columnName} IS NULL;`)
      emptyCount = scalarNumber(
        database,
        `SELECT COUNT(*) FROM ${tableName}
WHERE ${columnName} IS NOT NULL AND TRIM(CAST(${columnName} AS TEXT)) = '';`,
      )
      distinctCount = scalarNumber(database, `SELECT COUNT(DISTINCT ${columnName}) FROM ${tableName};`)
      sampleValues = rowsFromResult(
        database.exec(`SELECT DISTINCT ${columnName} AS value
FROM ${tableName}
WHERE ${columnName} IS NOT NULL AND TRIM(CAST(${columnName} AS TEXT)) <> ''
LIMIT 4;`)[0],
      ).map((row) => valueToShortText(row.value))
    } catch {
      sampleValues = []
    }

    const missing = nullCount + emptyCount
    const completeness = table.rowCount ? Math.max(0, 100 - (missing / table.rowCount) * 100) : 100

    return {
      name: column.name,
      type: column.type || 'untyped',
      nullCount,
      emptyCount,
      distinctCount,
      completeness,
      sampleValues,
      sensitive: isPiiLikeColumn(column.name),
      timestampLike: isTimestampLikeColumn(column.name),
    }
  })
}

export function inspectDatabaseHealth(database: Database | null): DatabaseHealth | null {
  if (!database) return null

  try {
    const foreignKeyIssues = rowsFromResult(database.exec('PRAGMA foreign_key_check;')[0]).length
    return {
      integrity: scalarText(database, 'PRAGMA integrity_check(1);'),
      foreignKeyIssues,
      pageCount: scalarNumber(database, 'PRAGMA page_count;'),
      pageSize: scalarNumber(database, 'PRAGMA page_size;'),
      freelistCount: scalarNumber(database, 'PRAGMA freelist_count;'),
      encoding: scalarText(database, 'PRAGMA encoding;'),
      objectCount: scalarNumber(database, "SELECT COUNT(*) FROM sqlite_master WHERE type IN ('table', 'index', 'view', 'trigger');"),
    }
  } catch {
    return null
  }
}
