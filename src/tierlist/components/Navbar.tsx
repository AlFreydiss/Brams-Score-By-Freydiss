import { Download, Flame, ListPlus, Star, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'

type Tab = 'create' | 'public' | 'top' | 'my'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: Array<{ id: Tab; label: string; icon: ReactNode; primary?: boolean }> = [
  { id: 'create', label: 'Créer', icon: <ListPlus size={16} />, primary: true },
  { id: 'public', label: 'Public', icon: <Download size={16} /> },
  { id: 'top', label: 'Top', icon: <Flame size={16} /> },
  { id: 'my', label: 'Mes listes', icon: <UserRound size={16} /> },
]

export function TierNavbar({ activeTab, onTabChange }: Props) {
  return (
    <header className="sticky top-[54px] z-20 border-b border-white/10 bg-[#0f0f0f]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-300 shadow-glow">
            <Star size={18} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-gamer text-2xl uppercase tracking-wide text-white">Tier List</h1>
            <p className="text-xs font-bold text-white/35">Créer, publier, remake, partager</p>
          </div>
        </div>

        <nav className="flex flex-wrap justify-end gap-2">
          {tabs.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={[
                  'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black transition',
                  active || tab.primary
                    ? 'bg-tiergold text-black shadow-glow hover:brightness-110'
                    : 'border border-white/10 bg-white/[0.055] text-white/70 hover:bg-white/[0.085] hover:text-white',
                  active && !tab.primary ? 'border-tiergold/40 text-tiergold' : '',
                ].join(' ')}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
