import { Braces, Clock3, Eye, FileSearch, Layers3, Network, ShieldAlert } from 'lucide-preact'
import type { IconComponent, ViewMode } from '../domain/types'

const views: Array<[ViewMode, IconComponent, string]> = [
  ['overview', FileSearch, 'Overview'],
  ['data', Eye, 'Data'],
  ['query', Braces, 'SQL'],
  ['forensics', ShieldAlert, 'Forensics'],
  ['timeline', Clock3, 'Timeline'],
  ['relations', Network, 'Relations'],
  ['diff', Layers3, 'Diff'],
]

export function WorkbenchNav({
  activeView,
  onChange,
}: {
  activeView: ViewMode
  onChange: (view: ViewMode) => void
}) {
  return (
    <nav class="border-b border-[#d7ded4] bg-white">
      <div class="thin-scrollbar mx-auto flex max-w-[1560px] gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        {views.map(([view, Icon, label]) => {
          const active = activeView === view
          return (
            <button
              type="button"
              aria-current={active ? 'page' : undefined}
              title={label}
              class={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
                active
                  ? 'border-[#123026] bg-[#123026] text-white shadow-sm shadow-[#123026]/20'
                  : 'border-[#d7ded4] bg-[#f8faf6] text-[#405044] hover:border-[#b9c7ba] hover:bg-white'
              }`}
              onClick={() => onChange(view)}
              key={view}
            >
              <Icon class="h-4 w-4" />
              {active ? <span class="h-1.5 w-1.5 rounded-full bg-teal-200" /> : null}
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
