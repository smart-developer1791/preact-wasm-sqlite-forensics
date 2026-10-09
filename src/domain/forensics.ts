import type { Database } from 'sql.js'
import type { Finding, ForensicReport, Severity, TableInfo, TimelineEvent } from './types'
import {
  isPiiLikeColumn,
  isTextLike,
  isTimestampLikeColumn,
  parsePossibleDate,
  quoteIdentifier,
  rowsFromResult,
  scalarNumber,
  valueToShortText,
  valueToText,
} from './sqlite'

export const severityRank: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
}

export function analyzeDatabase(database: Database, schema: TableInfo[]): ForensicReport {
  const findings: Finding[] = []
  const timeline: TimelineEvent[] = []
  let piiColumns = 0
  let missingValues = 0
  let orphanRecords = 0
  let sensitiveHits = 0

  const pushFinding = (finding: Omit<Finding, 'id'>) => {
    findings.push({
      ...finding,
      id: `${finding.table}-${findings.length}-${finding.title}`,
    })
  }

  schema.forEach((table) => {
    const primaryKeys = table.columns.filter((column) => column.pk > 0)
    if (primaryKeys.length === 0) {
      pushFinding({
        severity: table.rowCount > 0 ? 'medium' : 'low',
        table: table.name,
        title: 'Table has no primary key',
        detail: 'Row identity and diff confidence are weaker without a declared primary key.',
        evidence: `${table.rowCount.toLocaleString()} rows`,
      })
    }

    if (table.rowCount > 25 && table.indexes.length === 0) {
      pushFinding({
        severity: 'low',
        table: table.name,
        title: 'No secondary indexes',
        detail: 'Repeated investigative filters may scan the full table.',
        evidence: `${table.columns.length} columns`,
      })
    }

    table.columns.forEach((column) => {
      const columnName = quoteIdentifier(column.name)
      const tableName = quoteIdentifier(table.name)

      if (isPiiLikeColumn(column.name)) {
        piiColumns += 1
        pushFinding({
          severity: /(token|secret|password|credential|api[_-]?key|card|hash)/i.test(column.name) ? 'high' : 'medium',
          table: table.name,
          title: `Sensitive column: ${column.name}`,
          detail: 'Column naming indicates PII, credentials, card data, hashes, or network identifiers.',
          evidence: column.type || 'untyped',
        })
      }

      if (table.rowCount > 0) {
        try {
          const missing = scalarNumber(
            database,
            `SELECT COUNT(*) FROM ${tableName}
WHERE ${columnName} IS NULL OR TRIM(CAST(${columnName} AS TEXT)) = '';`,
          )
          missingValues += missing
          if (missing > 0 && missing / table.rowCount >= 0.35) {
            pushFinding({
              severity: missing / table.rowCount >= 0.7 ? 'medium' : 'info',
              table: table.name,
              title: `Sparse column: ${column.name}`,
              detail: 'A large share of rows have empty or NULL values.',
              evidence: `${missing.toLocaleString()} of ${table.rowCount.toLocaleString()} rows`,
            })
          }
        } catch {
          // Arbitrary SQLite files can include virtual tables or unusual casts.
        }
      }

      if (isTimestampLikeColumn(column.name)) {
        try {
          const rows = rowsFromResult(
            database.exec(`SELECT rowid AS rowid, ${columnName} AS value
FROM ${tableName}
WHERE ${columnName} IS NOT NULL AND TRIM(CAST(${columnName} AS TEXT)) <> ''
LIMIT 160;`)[0],
          )

          rows.forEach((row) => {
            const date = parsePossibleDate(row.value)
            if (!date) return
            timeline.push({
              id: `${table.name}-${column.name}-${valueToText(row.rowid)}-${valueToText(row.value)}`,
              table: table.name,
              column: column.name,
              rowid: valueToText(row.rowid),
              value: valueToText(row.value),
              date,
            })
          })
        } catch {
          // Timeline extraction is best-effort.
        }
      }

      if (isTextLike(column) && table.rowCount > 0) {
        try {
          const rows = rowsFromResult(
            database.exec(`SELECT rowid AS rowid, ${columnName} AS value
FROM ${tableName}
WHERE ${columnName} IS NOT NULL
LIMIT 120;`)[0],
          )
          rows.forEach((row) => {
            const text = valueToText(row.value)
            const matched =
              /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) ||
              /\b(?:sk|pk|api|token|secret|key)[-_a-z0-9]{12,}\b/i.test(text) ||
              /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/.test(text)

            if (matched) {
              sensitiveHits += 1
              if (sensitiveHits <= 16) {
                pushFinding({
                  severity: 'high',
                  table: table.name,
                  title: `Sensitive value sample in ${column.name}`,
                  detail: 'A sampled text value matched an email, token-like, key-like, or card-like pattern.',
                  evidence: `rowid ${valueToText(row.rowid)}: ${valueToShortText(row.value)}`,
                })
              }
            }
          })
        } catch {
          // Text scanning is intentionally bounded.
        }
      }
    })

    table.foreignKeys.forEach((foreignKey) => {
      const parent = schema.find((candidate) => candidate.name === foreignKey.table)
      const parentColumn = foreignKey.to || parent?.columns.find((column) => column.pk > 0)?.name || 'id'
      try {
        const orphanCount = scalarNumber(
          database,
          `SELECT COUNT(*)
FROM ${quoteIdentifier(table.name)} AS child
LEFT JOIN ${quoteIdentifier(foreignKey.table)} AS parent
  ON child.${quoteIdentifier(foreignKey.from)} = parent.${quoteIdentifier(parentColumn)}
WHERE child.${quoteIdentifier(foreignKey.from)} IS NOT NULL
  AND parent.${quoteIdentifier(parentColumn)} IS NULL;`,
        )
        orphanRecords += orphanCount
        if (orphanCount > 0) {
          pushFinding({
            severity: 'critical',
            table: table.name,
            title: `Orphan foreign key: ${foreignKey.from}`,
            detail: `Rows reference missing records in ${foreignKey.table}.${parentColumn}.`,
            evidence: `${orphanCount.toLocaleString()} orphan rows`,
          })
        }
      } catch {
        // Parent tables can be absent in partial database exports.
      }
    })
  })

  findings.sort((left, right) => severityRank[right.severity] - severityRank[left.severity])
  timeline.sort((left, right) => right.date.getTime() - left.date.getTime())

  return {
    findings,
    timeline,
    piiColumns,
    missingValues,
    orphanRecords,
    sensitiveHits,
  }
}
