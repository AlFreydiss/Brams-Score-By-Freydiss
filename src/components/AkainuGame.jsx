import { useCallback, useEffect, useRef, useState } from 'react'
import { useSoundEffect } from '../hooks/useSoundEffect.js'
import BramsTraitorGame from '../game/ui/BramsTraitorGame.jsx'

function useKonami(onActivate) {
  const seq = useRef([])
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

  useEffect(() => {
    const onKey = (event) => {
      seq.current = [...seq.current, event.key].slice(-10)
      if (seq.current.join(',') === code.join(',')) {
        seq.current = []
        onActivate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onActivate])
}

export default function AkainuGame() {
  const [open, setOpen] = useState(false)
  const { play } = useSoundEffect()

  useKonami(useCallback(() => {
    setOpen(true)
    play('awakening')
  }, [play]))

  if (!open) return null
  return <BramsTraitorGame onClose={() => setOpen(false)} />
}
