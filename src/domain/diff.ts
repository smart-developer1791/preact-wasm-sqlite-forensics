import type { Database } from 'sql.js'
import type { ComparisonRow } from './types'
import { inspectSchema } from './sqlite'

export function compareDatabases(current: Database, comparison: Database): ComparisonRow[] {
  const currentSchema = inspectSchema(current)
  const comparisonSchema = inspectSchema(comparison)
  const names = Array.from(new Set([...currentSchema, ...comparisonSchema].map((table) => table.name))).sort()

  return names.map((tableName) => {
    const currentTable = currentSchema.find((table) => table.name === tableName)
    const comparisonTable = comparisonSchema.find((table) => table.name === tableName)

    if (!currentTable) {
      return {
        table: tableName,
        status: 'added',
        currentRows: 0,
        comparisonRows: comparisonTable?.rowCount ?? 0,
        currentColumns: 0,
        comparisonColumns: comparisonTable?.columns.length ?? 0,
        detail: 'Table exists only in comparison snapshot.',
      }
    }

    if (!comparisonTable) {
      return {
        table: tableName,
        status: 'removed',
        currentRows: currentTable.rowCount,
        comparisonRows: 0,
        currentColumns: currentTable.columns.length,
        comparisonColumns: 0,
        detail: 'Table exists only in current database.',
      }
    }

    const currentColumns = currentTable.columns.map((column) => column.name)
    const comparisonColumns = comparisonTable.columns.map((column) => column.name)
    const addedColumns = comparisonColumns.filter((column) => !currentColumns.includes(column))
    const removedColumns = currentColumns.filter((column) => !comparisonColumns.includes(column))
    const changed =
      currentTable.rowCount !== comparisonTable.rowCount ||
      addedColumns.length > 0 ||
      removedColumns.length > 0 ||
      currentTable.sql !== comparisonTable.sql

    return {
      table: tableName,
      status: changed ? 'changed' : 'unchanged',
      currentRows: currentTable.rowCount,
      comparisonRows: comparisonTable.rowCount,
      currentColumns: currentTable.columns.length,
      comparisonColumns: comparisonTable.columns.length,
      detail: changed
        ? [
            currentTable.rowCount !== comparisonTable.rowCount
              ? `rows ${currentTable.rowCount.toLocaleString()} -> ${comparisonTable.rowCount.toLocaleString()}`
              : '',
            addedColumns.length ? `added columns: ${addedColumns.join(', ')}` : '',
            removedColumns.length ? `removed columns: ${removedColumns.join(', ')}` : '',
            currentTable.sql !== comparisonTable.sql ? 'DDL changed' : '',
          ]
            .filter(Boolean)
            .join('; ')
        : 'No schema or row-count drift detected.',
    }
  })
}
