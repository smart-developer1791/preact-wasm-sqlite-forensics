import {
  Binary,
  CheckCircle2,
  Cpu,
  Database as DatabaseIcon,
  Download,
  Layers3,
  RefreshCw,
  Upload,
} from 'lucide-preact'
import { AppShellButton, StatusPill } from './ui'
import { formatBytes } from '../domain/export'

export function Header({
  sqlReady,
  databaseLoaded,
  status,
  fileName,
  fileSize,
  comparisonName,
  comparisonSize,
  onLoadSample,
  onLoadDiffSample,
  onOpenDatabase,
  onOpenComparison,
  onExportDatabase,
}: {
  sqlReady: boolean
  databaseLoaded: boolean
  status: string
  fileName: string
  fileSize: number
  comparisonName: string
  comparisonSize: number
  onLoadSample: () => void
  onLoadDiffSample: () => void
  onOpenDatabase: (event: Event) => void
  onOpenComparison: (event: Event) => void
  onExportDatabase: () => void
}) {
  return (
    <header class="border-b border-[#2e3d34] bg-[#111a15] text-white">
      <div class="mx-auto flex max-w-[1560px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div class="flex min-w-0 items-center gap-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-teal-300/30 bg-teal-400/10">
              <Binary class="h-6 w-6 text-teal-200" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap gap-2">
                <StatusPill tone={sqlReady ? 'success' : 'warning'}>
                  {sqlReady ? <CheckCircle2 class="h-3.5 w-3.5" /> : <Cpu class="h-3.5 w-3.5" />}
                  {sqlReady ? 'Runtime ready' : 'Starting runtime'}
                </StatusPill>
                <StatusPill tone="dark">Browser local</StatusPill>
              </div>
              <h1 class="mt-1 text-2xl font-semibold text-white sm:text-3xl">Preact WASM SQLite Forensics</h1>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:min-w-[680px]">
            <AppShellButton icon={RefreshCw} tone="dark" disabled={!sqlReady} onClick={onLoadSample}>
              Load sample
            </AppShellButton>
            <AppShellButton icon={Layers3} tone="dark" disabled={!sqlReady} onClick={onLoadDiffSample}>
              Load diff sample
            </AppShellButton>
            <label class="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#314137] bg-[#17231d] px-3 text-sm font-semibold text-white transition hover:bg-[#20342b]">
              <Upload class="h-4 w-4" />
              <span>Open DB</span>
              <input class="sr-only" type="file" accept=".sqlite,.sqlite3,.db,.database" onInput={onOpenDatabase} />
            </label>
            <label class="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#314137] bg-[#17231d] px-3 text-sm font-semibold text-white transition hover:bg-[#20342b]">
              <Layers3 class="h-4 w-4" />
              <span>Open diff</span>
              <input class="sr-only" type="file" accept=".sqlite,.sqlite3,.db,.database" onInput={onOpenComparison} />
            </label>
            <AppShellButton icon={Download} tone="accent" disabled={!databaseLoaded} onClick={onExportDatabase}>
              Export DB
            </AppShellButton>
          </div>
        </div>

        <div class="grid gap-2 text-sm text-[#d7e6dc] lg:grid-cols-[1fr_auto] lg:items-center">
          <div class="grid min-w-0 gap-2 md:grid-cols-2">
            <span class="inline-flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <DatabaseIcon class="h-4 w-4 shrink-0 text-teal-200" />
              <span class="shrink-0 text-xs font-semibold uppercase text-[#9fb2a5]">Primary</span>
              <span class="truncate">{fileName}</span>
              <span class="shrink-0 text-[#9fb2a5]">{fileSize ? formatBytes(fileSize) : ''}</span>
            </span>
            <span class="inline-flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <Layers3 class="h-4 w-4 shrink-0 text-amber-200" />
              <span class="shrink-0 text-xs font-semibold uppercase text-[#9fb2a5]">Compare</span>
              <span class="truncate">{comparisonName}</span>
              <span class="shrink-0 text-[#9fb2a5]">{comparisonSize ? formatBytes(comparisonSize) : ''}</span>
            </span>
          </div>
          <span class="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase">
            {sqlReady ? <CheckCircle2 class="h-4 w-4 text-emerald-300" /> : <Cpu class="h-4 w-4 text-amber-200" />}
            {status}
          </span>
        </div>
      </div>
    </header>
  )
}
