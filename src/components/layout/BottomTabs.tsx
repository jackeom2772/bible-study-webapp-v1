import type { AppTabKey } from '../../types/bible'

interface BottomTabsProps {
  activeTab: AppTabKey
  onChange: (tab: AppTabKey) => void
}

const tabs: Array<{ key: AppTabKey; label: string }> = [
  { key: 'home', label: '홈' },
  { key: 'read', label: '성경읽기' },
  { key: 'resources', label: '자료' },
  { key: 'notes', label: '기록' },
  { key: 'more', label: '더보기' },
]

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  return (
    <nav className="border-t border-stone-200 bg-white/95 backdrop-blur">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={[
                'border-r border-stone-200 px-3 py-3 text-sm transition last:border-r-0',
                isActive
                  ? 'bg-stone-50 font-semibold text-slate-900'
                  : 'bg-white text-slate-500 hover:bg-stone-50 hover:text-slate-800',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}