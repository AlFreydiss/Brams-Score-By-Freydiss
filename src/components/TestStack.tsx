// ── Page de TEST de la nouvelle stack (TEMPORAIRE, à retirer après validation)
// Preuve que TypeScript + Tailwind + shadcn cohabitent avec l'existant :
// .tsx typé, classes Tailwind scannées via './src/**/*.tsx', Button shadcn
// local (@/components/ui), tokens dark + or Brams de ui.css. Le CSS shadcn est
// importé ici même (ui.css, sans preflight) → zéro impact sur le reste.
import { useState, type FC } from 'react'
import { Button as ButtonJs } from '@/components/ui/button'
import '@/components/ui/ui.css'

// Les composants ui/ existants sont en .jsx non typé : tsc infère leurs props
// destructurées comme requises. Cast de transition — les FUTURS composants ui
// seront en .tsx typé (components.json tsx:true) et n'en auront pas besoin.
const Button = ButtonJs as FC<Record<string, unknown>>

type Counter = { clicks: number }

export default function TestStack() {
  const [state, setState] = useState<Counter>({ clicks: 0 })

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <p className="text-xs font-mono tracking-[0.3em] uppercase text-primary mb-2">
          Nouvelle stack
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          Tailwind + TypeScript + shadcn
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Composant .tsx typé, classes Tailwind, Button shadcn aux tokens Brams
          (primary = or). Les pages inline-styles existantes ne sont pas touchées.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={() => setState(s => ({ clicks: s.clicks + 1 }))}>
            Clics : {state.clicks}
          </Button>
          <Button variant="outline" onClick={() => setState({ clicks: 0 })}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
