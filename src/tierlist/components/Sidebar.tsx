import { Download, FileImage, Globe2, Lock, MessageCircle, Plus, Sparkles } from 'lucide-react'
import type { Tier } from '../types'
import { THEME_IDEAS } from '../data'

type Props = {
  title: string
  theme: string
  newItems: string
  newTier: string
  tiers: Tier[]
  onTitleChange: (value: string) => void
  onThemeChange: (value: string) => void
  onNewItemsChange: (value: string) => void
  onNewTierChange: (value: string) => void
  onAddItems: () => void
  onAddTier: () => void
  onGenerateImage: () => void
  onPublish: (visibility: 'public' | 'private') => void
  onShareDiscord: () => void
  onUseIdea: (idea: string) => void
}

export function Sidebar({
  title,
  theme,
  newItems,
  newTier,
  onTitleChange,
  onThemeChange,
  onNewItemsChange,
  onNewTierChange,
  onAddItems,
  onAddTier,
  onGenerateImage,
  onPublish,
  onShareDiscord,
  onUseIdea,
}: Props) {
  return (
    <aside className="tier-scrollbar h-fit max-h-[calc(100vh-150px)] overflow-auto rounded-2xl border border-white/10 bg-[#171717]/92 p-5 shadow-tier backdrop-blur-xl lg:sticky lg:top-[130px]">
      <Field label="Titre de la tier list">
        <input value={title} onChange={event => onTitleChange(event.target.value)} className="tier-input" />
      </Field>

      <Field label="Thème">
        <input value={theme} onChange={event => onThemeChange(event.target.value)} className="tier-input" />
      </Field>

      <div className="mb-5 flex flex-wrap gap-2">
        {THEME_IDEAS.slice(0, 5).map(idea => (
          <button key={idea} type="button" onClick={() => onUseIdea(idea)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-black text-white/45 transition hover:border-tiergold/40 hover:text-tiergold">
            {idea}
          </button>
        ))}
      </div>

      <Field label="Ajouter des éléments">
        <textarea
          value={newItems}
          onChange={event => onNewItemsChange(event.target.value)}
          placeholder="Un élément par ligne ou séparé par virgules"
          className="tier-input min-h-[118px] resize-y py-3"
        />
        <button type="button" onClick={onAddItems} className="tier-primary mt-3 w-full">
          <Plus size={16} />
          Ajouter
        </button>
      </Field>

      <Field label="Ajouter un tier">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input value={newTier} onChange={event => onNewTierChange(event.target.value)} placeholder="Ex: GOAT" className="tier-input" />
          <button type="button" onClick={onAddTier} className="tier-primary w-11 px-0">
            <Plus size={18} />
          </button>
        </div>
      </Field>

      <div className="mt-6 grid gap-2">
        <ActionButton primary icon={<FileImage size={16} />} onClick={onGenerateImage}>Générer l’image</ActionButton>
        <ActionButton icon={<Globe2 size={16} />} onClick={() => onPublish('public')}>Publier public</ActionButton>
        <ActionButton icon={<Lock size={16} />} onClick={() => onPublish('private')}>Publier privé</ActionButton>
        <ActionButton icon={<MessageCircle size={16} />} onClick={onShareDiscord}>Partager Discord</ActionButton>
      </div>

      <div className="mt-5 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.06] p-4 text-xs leading-6 text-white/45">
        <div className="mb-1 flex items-center gap-2 font-black text-tiergold">
          <Sparkles size={14} />
          Astuce
        </div>
        Glisse les cartes entre les tiers ou dans le pool. Le bouton image télécharge un PNG haute qualité.
      </div>
    </aside>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-5 block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-white/38">{label}</span>
      {children}
    </label>
  )
}

function ActionButton({ children, icon, primary, onClick }: { children: React.ReactNode; icon: React.ReactNode; primary?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={primary ? 'tier-primary w-full' : 'tier-secondary w-full'}
    >
      {icon}
      {children}
    </button>
  )
}

export const sidebarCss = `
  .tier-input {
    width: 100%;
    border-radius: 0.875rem;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.06);
    color: #fff;
    min-height: 44px;
    padding: 0 14px;
    outline: none;
    font-weight: 800;
  }
  .tier-input:focus {
    border-color: rgba(246,197,47,.55);
    box-shadow: 0 0 0 3px rgba(246,197,47,.10);
  }
  .tier-primary,
  .tier-secondary {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    border-radius: .875rem;
    font-size: .875rem;
    font-weight: 950;
    transition: transform .16s ease, filter .16s ease, background .16s ease, border-color .16s ease;
  }
  .tier-primary {
    background: linear-gradient(135deg, #f6c52f, #e1a80d);
    color: #171006;
  }
  .tier-secondary {
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.055);
    color: rgba(255,255,255,.72);
  }
  .tier-primary:hover,
  .tier-secondary:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }
`
