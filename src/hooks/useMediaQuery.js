import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    setMatches(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

export const useMobile  = () => useMediaQuery('(max-width: 768px)')
export const useTablet  = () => useMediaQuery('(max-width: 1024px)')
export const useNarrow  = () => useMediaQuery('(max-width: 1100px)')
export const useLowEnd  = () => {
  const lowMem = typeof navigator !== 'undefined' && navigator.deviceMemory < 4
  const mobile = useMediaQuery('(max-width: 768px)')
  return lowMem || mobile
}
