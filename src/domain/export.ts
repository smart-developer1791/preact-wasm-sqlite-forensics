import { format } from 'date-fns'
import type { RowRecord } from './types'
import { valueToText } from './sqlite'

export function rowsToCsv(columns: string[], rows: RowRecord[]) {
  const escape = (value: RowRecord[string]) => {
    const text = valueToText(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  return [columns.join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\n')
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(payload: unknown, fileName: string) {
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), fileName)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDate(date: Date) {
  try {
    return format(date, 'yyyy-MM-dd HH:mm')
  } catch {
    return date.toISOString()
  }
}
