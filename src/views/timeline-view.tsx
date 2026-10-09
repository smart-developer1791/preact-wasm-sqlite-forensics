import { Activity, Clock3 } from 'lucide-preact'
import type { ForensicReport, TimelineBucket } from '../domain/types'
import { formatDate } from '../domain/export'
import { PanelTitle, StatusPill } from '../components/ui'

export function TimelineView({
  forensicReport,
  timelineBuckets,
}: {
  forensicReport: ForensicReport
  timelineBuckets: TimelineBucket[]
}) {
  const maxBucket = Math.max(1, ...timelineBuckets.map((bucket) => bucket.count))
  const eventDates = forensicReport.timeline.map((event) => event.date.getTime())
  const firstEvent = eventDates.length ? new Date(Math.min(...eventDates)) : null
  const lastEvent = eventDates.length ? new Date(Math.max(...eventDates)) : null

  return (
    <section class="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div class="rounded-lg border border-[#d7ded4] bg-white">
        <PanelTitle icon={Clock3} title="Event Density" meta={`${timelineBuckets.length} days`} />
        <div class="grid gap-3 p-4">
          {timelineBuckets.map((bucket) => (
            <div key={bucket.day}>
              <div class="mb-1 flex items-center justify-between text-xs font-semibold text-[#516154]">
                <span>{bucket.day}</span>
                <span>{bucket.count}</span>
              </div>
              <div class="h-2 rounded-md bg-[#e2e9df]">
                <div class="h-2 rounded-md bg-teal-700" style={{ width: `${Math.max(6, (bucket.count / maxBucket) * 100)}%` }} />
              </div>
            </div>
          ))}
          {timelineBuckets.length === 0 ? <p class="text-sm text-[#667467]">No timestamp-like values found.</p> : null}
        </div>
      </div>

      <div class="rounded-lg border border-[#d7ded4] bg-white">
        <PanelTitle icon={Activity} title="Extracted Timeline" meta={`${forensicReport.timeline.length} events`} />
        <div class="thin-scrollbar max-h-[720px] overflow-auto p-4">
          <div class="mb-3 flex flex-wrap gap-2">
            <StatusPill>{timelineBuckets.length.toLocaleString()} days</StatusPill>
            {firstEvent ? <StatusPill>from {formatDate(firstEvent)}</StatusPill> : null}
            {lastEvent ? <StatusPill>to {formatDate(lastEvent)}</StatusPill> : null}
          </div>
          <div class="grid gap-2">
            {forensicReport.timeline.slice(0, 220).map((event) => (
              <div class="grid gap-2 rounded-lg border border-[#e0e7dd] bg-[#fbfcfa] p-3 md:grid-cols-[180px_1fr]" key={event.id}>
                <div class="font-mono text-xs font-semibold text-[#123026]">{formatDate(event.date)}</div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-[#14211b]">{event.table}.{event.column}</p>
                  <p class="mt-1 truncate font-mono text-xs text-[#657267]">rowid {event.rowid} / {event.value}</p>
                </div>
              </div>
            ))}
            {forensicReport.timeline.length === 0 ? <p class="p-4 text-sm text-[#667467]">No events extracted.</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
