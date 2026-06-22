// src/features/nouveau-monde/pages/JournalPage.jsx
// Le Journal : feed simple des events / nouveautés du Nouveau Monde.
// Route nested : /nouveau-monde/news

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getJournal } from '../data/api'
import { nm } from '../theme/tokens'

const KIND_COLOR = {
  release: nm.color.goldHi,
  island:  nm.color.shallow,
  event:   nm.color.dusk,
}

export default function JournalPage() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => { const data = await getJournal(); if (alive) setItems(data) })()
    return () => { alive = false }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: `${nm.space.md} ${nm.space.xl} ${nm.space.xxl}` }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: nm.space.lg }}>
          <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi }}>Carnet de bord</div>
          <h1 style={{ ...nm.type.posterTitle, color: nm.color.parchment, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', margin: '4px 0' }}>Le Journal</h1>
          <p style={{ ...nm.type.body, color: nm.color.foamDim, margin: 0 }}>Les nouvelles de l'archipel et les events à venir.</p>
        </div>

        <div style={{ position: 'relative', paddingLeft: nm.space.lg }}>
          {/* Fil de la timeline */}
          <div aria-hidden style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: `linear-gradient(${nm.color.gold}88, transparent)` }} />

          {!items ? (
            <div style={{ display: 'grid', gap: nm.space.md }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div key={i} animate={{ opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                  style={{ height: 88, borderRadius: nm.radius.lg, background: 'rgba(234,243,244,0.06)' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: nm.space.md }}>
              {items.map((it, i) => (
                <motion.article key={it.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, ease: nm.motion.easeOut }}
                  style={{ position: 'relative' }}>
                  <span aria-hidden style={{
                    position: 'absolute', left: -nm.space.lg, top: 18, transform: 'translateX(-50%)',
                    width: 16, height: 16, borderRadius: '50%',
                    background: nm.color.deepSea, border: `2px solid ${KIND_COLOR[it.kind] || nm.color.gold}`,
                    boxShadow: `0 0 12px ${KIND_COLOR[it.kind] || nm.color.gold}88`,
                  }} />
                  <div style={{
                    borderRadius: nm.radius.lg, padding: nm.space.lg,
                    background: 'rgba(6,20,31,0.6)', border: `1px solid ${nm.color.mist}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: '1.3rem' }} aria-hidden>{it.icon}</span>
                      <h2 style={{ fontFamily: nm.fonts.display, fontWeight: 700, fontSize: '1.15rem', color: nm.color.foam, margin: 0 }}>{it.title}</h2>
                      <span style={{ marginLeft: 'auto', ...nm.type.small, color: nm.color.foamDim }}>{it.when}</span>
                    </div>
                    <p style={{ ...nm.type.body, color: nm.color.foamDim, margin: 0 }}>{it.body}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: nm.space.lg }}>
          <Link to="/nouveau-monde" style={{ ...nm.type.button, color: nm.color.foamDim, textDecoration: 'none' }}>← Retour à la carte</Link>
        </div>
      </div>
    </div>
  )
}
