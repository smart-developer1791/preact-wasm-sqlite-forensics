import { useEffect, useMemo, useState } from 'preact/hooks'
import { format as formatDateKey } from 'date-fns'
import { get, set } from 'idb-keyval'
import { Fingerprint } from 'lucide-preact'
import type { Database, SqlJsStatic } from 'sql.js'
import { Header } from './components/header'
import { MetricStrip } from './components/metric-strip'
import { WorkbenchNav } from './components/workbench-nav'
import { comparisonSampleUrl, defaultQuery, emptyReport, sampleUrl, wasmUrl } from './domain/constants'
import { compareDatabases } from './domain/diff'
import { downloadBlob, downloadJson, rowsToCsv } from './domain/export'
import { analyzeDatabase } from './domain/forensics'
import { getAutoRunnableQuery, getExplainableQuery } from './domain/query'
import { inspectDatabaseHealth, inspectSchema, profileTable, quoteIdentifier, rowsFromResult, sqlString } from './domain/sqlite'
import type { ForensicReport, QueryResult, RelationEdge, RowRecord, TableInfo, TimelineBucket, ViewMode } from './domain/types'
import { DataView } from './views/data-view'
import { DiffView } from './views/diff-view'
import { ForensicsView } from './views/forensics-view'
import { OverviewView } from './views/overview-view'
import { QueryView } from './views/query-view'
import { RelationsView } from './views/relations-view'
import { TimelineView } from './views/timeline-view'

const savedQueryKey = 'preact-wasm-sqlite-forensics:last-query'
const savedHistoryKey = 'preact-wasm-sqlite-forensics:query-history'

export function App() {
  const [sqlApi, setSqlApi] = useState<SqlJsStatic | null>(null)
  const [db, setDb] = useState<Database | null>(null)
  const [comparisonDb, setComparisonDb] = useState<Database | null>(null)
  const [schema, setSchema] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState('')
  const [tableRows, setTableRows] = useState<RowRecord[]>([])
  const [tableFilter, setTableFilter] = useState('')
  const [query, setQuery] = useState(defaultQuery)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryPlan, setQueryPlan] = useState<QueryResult | null>(null)
  const [queryHistory, setQueryHistory] = useState<string[]>([])
  const [queryError, setQueryError] = useState('')
  const [planError, setPlanError] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [status, setStatus] = useState('Initializing SQLite WASM runtime...')
  const [fileName, setFileName] = useState('No database loaded')
  const [fileSize, setFileSize] = useState(0)
  const [comparisonName, setComparisonName] = useState('No comparison snapshot')
  const [comparisonSize, setComparisonSize] = useState(0)
  const [activeView, setActiveView] = useState<ViewMode>('overview')
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false)
  const [hasRestoredLocalState, setHasRestoredLocalState] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy CSV')

  const selectedTableInfo = useMemo(
    () => schema.find((table) => table.name === selectedTable) ?? schema[0],
    [schema, selectedTable],
  )
  const totalRows = useMemo(() => schema.reduce((sum, table) => sum + table.rowCount, 0), [schema])
  const forensicReport = useMemo<ForensicReport>(
    () => (db ? analyzeDatabase(db, schema) : (emptyReport as ForensicReport)),
    [db, schema],
  )
  const comparisonRows = useMemo(() => (db && comparisonDb ? compareDatabases(db, comparisonDb) : []), [db, comparisonDb])
  const relationEdges = useMemo<RelationEdge[]>(
    () =>
      schema.flatMap((table) =>
        table.foreignKeys.map((foreignKey) => ({
          from: table.name,
          to: foreignKey.table,
          label: `${foreignKey.from} -> ${foreignKey.to || 'pk'}`,
        })),
      ),
    [schema],
  )
  const timelineBuckets = useMemo<TimelineBucket[]>(() => {
    const bucketMap = new Map<string, number>()
    forensicReport.timeline.forEach((event) => {
      const key = formatDateKey(event.date, 'yyyy-MM-dd')
      bucketMap.set(key, (bucketMap.get(key) ?? 0) + 1)
    })
    return Array.from(bucketMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((left, right) => left.day.localeCompare(right.day))
  }, [forensicReport.timeline])
  const columnProfiles = useMemo(() => profileTable(db, selectedTableInfo), [db, selectedTableInfo])
  const health = useMemo(() => inspectDatabaseHealth(db), [db, schema])

  useEffect(() => {
    let mounted = true
    void import('sql.js')
      .then(({ default: initSqlJs }) =>
        initSqlJs({
          locateFile: () => wasmUrl,
        }),
      )
      .then((api) => {
        if (!mounted) return
        setSqlApi(api)
        setStatus('SQLite WASM runtime ready')
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : 'Failed to initialize SQLite WASM')
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void Promise.all([get<string>(savedQueryKey), get<string[]>(savedHistoryKey)])
      .then(([savedQuery, savedHistory]) => {
        if (!mounted) return
        if (savedQuery) setQuery(savedQuery)
        if (Array.isArray(savedHistory)) setQueryHistory(savedHistory.slice(0, 8))
      })
      .catch(() => {
        // IndexedDB can be unavailable in restrictive browser contexts.
      })
      .finally(() => {
        if (mounted) setHasRestoredLocalState(true)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (query.trim()) {
      void set(savedQueryKey, query)
    }
  }, [query])

  useEffect(() => {
    void set(savedHistoryKey, queryHistory)
  }, [queryHistory])

  useEffect(() => {
    if (!sqlApi || db || hasLoadedInitial || !hasRestoredLocalState) return
    setHasLoadedInitial(true)
    void loadDatabaseFromUrl(sampleUrl, 'sample-forensics.sqlite')
  }, [sqlApi, db, hasLoadedInitial, hasRestoredLocalState])

  useEffect(() => {
    if (!db || !selectedTableInfo) {
      setTableRows([])
      return
    }
    loadTablePreview(selectedTableInfo)
  }, [db, selectedTableInfo, tableFilter])

  function refreshSchema(database = db) {
    if (!database) return []
    const nextSchema = inspectSchema(database)
    setSchema(nextSchema)
    setSelectedTable((current) => {
      if (nextSchema.some((table) => table.name === current)) return current
      return nextSchema[0]?.name ?? ''
    })
    return nextSchema
  }

  async function loadDatabaseFromUrl(url: string, name: string, target: 'primary' | 'comparison' = 'primary') {
    if (!sqlApi) return
    setStatus(`Loading ${name}...`)
    try {
      const response = await fetch(url)
      const bytes = new Uint8Array(await response.arrayBuffer())
      openDatabaseBytes(bytes, name, bytes.byteLength, target)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Could not load ${name}`)
    }
  }

  function openDatabaseBytes(
    bytes: Uint8Array,
    name: string,
    size: number,
    target: 'primary' | 'comparison' = 'primary',
  ) {
    if (!sqlApi) {
      setStatus('SQLite WASM runtime is not ready yet')
      return
    }

    try {
      const nextDb = new sqlApi.Database(bytes)
      nextDb.exec('PRAGMA foreign_keys = OFF;')

      if (target === 'comparison') {
        comparisonDb?.close()
        setComparisonDb(nextDb)
        setComparisonName(name)
        setComparisonSize(size)
        setStatus(`Comparison snapshot loaded: ${name}`)
        return
      }

      db?.close()
      setDb(nextDb)
      setFileName(name)
      setFileSize(size)
      const nextSchema = inspectSchema(nextDb)
      setSchema(nextSchema)
      setSelectedTable(nextSchema[0]?.name ?? '')
      const autoRunnableQuery = getAutoRunnableQuery(query) ?? (query.trim() ? null : defaultQuery)
      if (autoRunnableQuery) {
        executeQuery(autoRunnableQuery, nextDb, { recordHistory: false })
      } else {
        setQueryResult(null)
        setQueryPlan(null)
        setQueryError('Database loaded. The current SQL was restored but not auto-run because it may modify data.')
        setPlanError('')
      }
      setStatus(`Loaded ${name}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open SQLite database')
    }
  }

  async function handleFileUpload(event: Event, target: 'primary' | 'comparison' = 'primary') {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const bytes = new Uint8Array(await file.arrayBuffer())
    openDatabaseBytes(bytes, file.name, file.size, target)
    input.value = ''
  }

  function loadTablePreview(table: TableInfo) {
    if (!db) return
    try {
      const term = tableFilter.trim()
      const where = term
        ? `WHERE ${table.columns
            .map((column) => `CAST(${quoteIdentifier(column.name)} AS TEXT) LIKE ${sqlString(`%${term}%`)}`)
            .join(' OR ')}`
        : ''
      const result = db.exec(`SELECT * FROM ${quoteIdentifier(table.name)} ${where} LIMIT 150;`)[0]
      setTableRows(rowsFromResult(result))
      setPreviewError('')
    } catch (error) {
      setTableRows([])
      setPreviewError(error instanceof Error ? error.message : 'Could not read table preview')
    }
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery)
    setQueryPlan(null)
    setPlanError('')
  }

  function executeQuery(sql = query, database = db, options: { recordHistory?: boolean } = {}) {
    if (!database) return
    const { recordHistory = true } = options
    const normalized = sql.trim()
    const started = performance.now()
    try {
      setQueryPlan(null)
      setPlanError('')
      const results = database.exec(sql)
      const result = results[results.length - 1]
      const rows = rowsFromResult(result)
      const durationMs = performance.now() - started
      const changedRows = database.getRowsModified()
      setQueryResult({
        columns: result?.columns ?? [],
        rows,
        durationMs,
        changedRows,
        message: result ? `${rows.length.toLocaleString()} visible rows` : 'Statement executed',
      })
      setQueryError('')
      setPlanError('')
      if (recordHistory) {
        setQueryHistory((current) => (normalized ? [normalized, ...current.filter((item) => item !== normalized)].slice(0, 8) : current))
      }
      refreshSchema(database)
      setStatus(`Query completed in ${durationMs.toFixed(1)} ms`)
    } catch (error) {
      setQueryResult(null)
      setQueryError(error instanceof Error ? error.message : 'Query failed')
      setStatus('Query failed')
    }
  }

  function runTableQuery(tableName: string) {
    const sql = `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 75;`
    handleQueryChange(sql)
    setActiveView('query')
    executeQuery(sql)
  }

  function useQuery(sql: string) {
    handleQueryChange(sql)
    setActiveView('query')
    executeQuery(sql)
  }

  async function formatCurrentQuery() {
    try {
      const { format: formatSql } = await import('sql-formatter')
      const formatted = formatSql(query, {
        language: 'sqlite',
        keywordCase: 'upper',
        linesBetweenQueries: 1,
      })
      handleQueryChange(formatted)
      setQueryError('')
      setStatus('SQL formatted')
    } catch (error) {
      setQueryError(error instanceof Error ? error.message : 'Could not format SQL')
    }
  }

  function explainQueryPlan() {
    if (!db) return
    const explainable = getExplainableQuery(query)
    if (explainable.error || !explainable.query) {
      setQueryPlan(null)
      setPlanError(explainable.error ?? 'Could not explain query plan')
      return
    }

    try {
      const started = performance.now()
      const result = db.exec(`EXPLAIN QUERY PLAN ${explainable.query}`)[0]
      const rows = rowsFromResult(result)
      const durationMs = performance.now() - started
      setQueryPlan({
        columns: result?.columns ?? [],
        rows,
        durationMs,
        changedRows: 0,
        message: `${rows.length.toLocaleString()} plan steps`,
      })
      setPlanError('')
      setStatus(`Explain plan completed in ${durationMs.toFixed(1)} ms`)
    } catch (error) {
      setQueryPlan(null)
      setPlanError(error instanceof Error ? error.message : 'Could not explain query plan')
    }
  }

  function clearQueryHistory() {
    setQueryHistory([])
    void set(savedHistoryKey, [])
  }

  function copyQueryCsv() {
    if (!queryResult) return
    void navigator.clipboard.writeText(rowsToCsv(queryResult.columns, queryResult.rows)).then(() => {
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Copy CSV'), 1400)
    })
  }

  function downloadQueryCsv() {
    if (!queryResult) return
    downloadBlob(new Blob([rowsToCsv(queryResult.columns, queryResult.rows)], { type: 'text/csv' }), 'sqlite-query-result.csv')
  }

  function downloadDatabase() {
    if (!db) return
    const bytes = db.export()
    downloadBlob(
      new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.sqlite3' }),
      fileName.replace(/\.(db|sqlite3?|database)$/i, '') + '-export.sqlite',
    )
  }

  function exportForensicReport() {
    downloadJson(
      {
        database: fileName,
        generatedAt: new Date().toISOString(),
        schema: schema.map((table) => ({
          name: table.name,
          rowCount: table.rowCount,
          columns: table.columns.length,
          indexes: table.indexes.length,
          foreignKeys: table.foreignKeys.length,
        })),
        health,
        summary: {
          findings: forensicReport.findings.length,
          timelineEvents: forensicReport.timeline.length,
          sensitiveColumns: forensicReport.piiColumns,
          sensitiveHits: forensicReport.sensitiveHits,
          missingValues: forensicReport.missingValues,
          orphanRecords: forensicReport.orphanRecords,
        },
        findings: forensicReport.findings,
        timeline: forensicReport.timeline.map((event) => ({
          ...event,
          date: event.date.toISOString(),
        })),
        snapshotDiff: comparisonRows,
      },
      'sqlite-forensic-report.json',
    )
  }

  return (
    <main class="min-h-screen bg-[#f5f7f1] text-[#14211b]">
      <Header
        sqlReady={Boolean(sqlApi)}
        databaseLoaded={Boolean(db)}
        status={status}
        fileName={fileName}
        fileSize={fileSize}
        comparisonName={comparisonName}
        comparisonSize={comparisonSize}
        onLoadSample={() => void loadDatabaseFromUrl(sampleUrl, 'sample-forensics.sqlite')}
        onLoadDiffSample={() => void loadDatabaseFromUrl(comparisonSampleUrl, 'sample-forensics-after.sqlite', 'comparison')}
        onOpenDatabase={(event) => void handleFileUpload(event)}
        onOpenComparison={(event) => void handleFileUpload(event, 'comparison')}
        onExportDatabase={downloadDatabase}
      />

      <MetricStrip
        schema={schema}
        totalRows={totalRows}
        forensicReport={forensicReport}
        comparisonRows={comparisonRows}
        hasComparison={Boolean(comparisonDb)}
      />

      <WorkbenchNav activeView={activeView} onChange={setActiveView} />

      <div class="mx-auto max-w-[1560px] px-4 py-5 sm:px-6 lg:px-8">
        {activeView === 'overview' ? (
          <OverviewView
            schema={schema}
            selectedTableInfo={selectedTableInfo}
            forensicReport={forensicReport}
            health={health}
            onSelectTable={setSelectedTable}
            onRunTableQuery={runTableQuery}
          />
        ) : null}

        {activeView === 'data' ? (
          <DataView
            schema={schema}
            selectedTableInfo={selectedTableInfo}
            tableRows={tableRows}
            tableFilter={tableFilter}
            previewError={previewError}
            columnProfiles={columnProfiles}
            onSelectTable={setSelectedTable}
            onTableFilterChange={setTableFilter}
            onRunTableQuery={runTableQuery}
          />
        ) : null}

        {activeView === 'query' ? (
          <QueryView
            query={query}
            queryResult={queryResult}
            queryPlan={queryPlan}
            queryError={queryError}
            planError={planError}
            queryHistory={queryHistory}
            copyLabel={copyLabel}
            schema={schema}
            onQueryChange={handleQueryChange}
            onExecute={(sql) => executeQuery(sql ?? query)}
            onUseQuery={useQuery}
            onFormatSql={formatCurrentQuery}
            onExplainPlan={explainQueryPlan}
            onCopyCsv={copyQueryCsv}
            onDownloadCsv={downloadQueryCsv}
            onClearHistory={clearQueryHistory}
          />
        ) : null}

        {activeView === 'forensics' ? (
          <ForensicsView forensicReport={forensicReport} schema={schema} onExportReport={exportForensicReport} />
        ) : null}

        {activeView === 'timeline' ? (
          <TimelineView forensicReport={forensicReport} timelineBuckets={timelineBuckets} />
        ) : null}

        {activeView === 'relations' ? (
          <RelationsView
            schema={schema}
            selectedTableName={selectedTableInfo?.name}
            relationEdges={relationEdges}
            onSelectTable={setSelectedTable}
          />
        ) : null}

        {activeView === 'diff' ? (
          <DiffView
            comparisonRows={comparisonRows}
            hasComparison={Boolean(comparisonDb)}
            sqlReady={Boolean(sqlApi)}
            onLoadComparisonSample={() => void loadDatabaseFromUrl(comparisonSampleUrl, 'sample-forensics-after.sqlite', 'comparison')}
            onOpenComparison={(event) => void handleFileUpload(event, 'comparison')}
          />
        ) : null}

        <footer class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d7ded4] bg-white px-4 py-3 text-xs text-[#667467]">
          <span class="inline-flex items-center gap-2">
            <Fingerprint class="h-4 w-4 text-teal-700" />
            Local-first inspection. SQLite stays inside the browser runtime.
          </span>
          <span>Desktop-first database UI with mobile-safe stacked views.</span>
        </footer>
      </div>
    </main>
  )
}
