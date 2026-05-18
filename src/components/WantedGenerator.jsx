import { useRef, useState, useCallback } from 'react'

function randomPrime() {
  const base = Math.floor(Math.random() * 9 + 1) * 100
  const cents = Math.floor(Math.random() * 9) * 10
  return (base + cents) * 1_000_000
}

function formatPrime(n) {
  return n.toLocaleString('fr-FR') + ' Berrys'
}

const EPITHETS = [
  'Le Pirate Sans Peur', 'La Terreur des Mers', 'Le Fantôme des Flots',
  "L'Ange Maudit", 'Le Dieu de la Destruction', "L'Ombre du Grand Line",
  'Le Conquérant du Nouveau Monde', 'La Foudre des Sept Mers',
]

export default function WantedGenerator() {
  const canvasRef = useRef(null)
  const [pseudo, setPseudo] = useState('')
  const [photo, setPhoto] = useState(null)
  const [prime, setPrime] = useState(() => randomPrime())
  const [epithet, setEpithet] = useState(EPITHETS[0])
  const [generated, setGenerated] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileRef = useRef(null)

  const drawPoster = useCallback((currentPrime, currentEpithet, currentPseudo, currentPhoto) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const W = 480, H = 640
    canvas.width = W
    canvas.height = H

    const drawAll = (photoImg) => {
      // Fond papier vieilli
      ctx.fillStyle = '#c8a96e'
      ctx.fillRect(0, 0, W, H)

      // Texture
      for (let i = 0; i < 2000; i++) {
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '0,0,0' : '255,220,150'}, ${Math.random() * 0.04})`
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2)
      }

      // Bordures
      ctx.strokeStyle = '#5a3a0a'
      ctx.lineWidth = 14
      ctx.strokeRect(7, 7, W - 14, H - 14)
      ctx.strokeStyle = '#7a5010'
      ctx.lineWidth = 3
      ctx.strokeRect(20, 20, W - 40, H - 40)

      // WANTED
      ctx.fillStyle = '#1a0800'
      ctx.font = 'bold 76px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('WANTED', W / 2, 85)
      ctx.font = 'italic 18px Georgia, serif'
      ctx.fillStyle = '#3a1e05'
      ctx.fillText('DEAD OR ALIVE', W / 2, 108)

      // Zone photo
      const photoX = 60, photoY = 125, photoW = W - 120, photoH = 280
      ctx.fillStyle = '#a87030'
      ctx.fillRect(photoX - 4, photoY - 4, photoW + 8, photoH + 8)
      ctx.fillStyle = '#222'
      ctx.fillRect(photoX, photoY, photoW, photoH)

      if (photoImg) {
        const scale = Math.max(photoW / photoImg.width, photoH / photoImg.height)
        const sw = photoImg.width * scale, sh = photoImg.height * scale
        const sx = photoX + (photoW - sw) / 2, sy = photoY + (photoH - sh) / 2
        ctx.save()
        ctx.beginPath()
        ctx.rect(photoX, photoY, photoW, photoH)
        ctx.clip()
        ctx.drawImage(photoImg, sx, sy, sw, sh)
        ctx.restore()
      } else {
        ctx.fillStyle = '#555'
        ctx.font = '100px serif'
        ctx.textAlign = 'center'
        ctx.fillText('🏴‍☠️', W / 2, photoY + photoH / 2 + 36)
      }

      const bottomY = photoY + photoH + 18
      const name = currentPseudo.trim() || 'Inconnu'

      ctx.textAlign = 'center'
      ctx.fillStyle = '#1a0800'
      ctx.font = `bold ${name.length > 14 ? 26 : 32}px Georgia, serif`
      ctx.fillText(`"${name}"`, W / 2, bottomY + 32)

      ctx.font = 'italic 14px Georgia, serif'
      ctx.fillStyle = '#5a3a0a'
      ctx.fillText(currentEpithet, W / 2, bottomY + 54)

      ctx.strokeStyle = '#7a5010'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(60, bottomY + 66)
      ctx.lineTo(W - 60, bottomY + 66)
      ctx.stroke()

      ctx.fillStyle = '#8b0000'
      ctx.font = 'bold 20px Georgia, serif'
      ctx.fillText('PRIME', W / 2, bottomY + 88)

      ctx.fillStyle = '#1a0800'
      const primeStr = formatPrime(currentPrime)
      ctx.font = `bold ${primeStr.length > 22 ? 22 : 28}px Georgia, serif`
      ctx.fillText(primeStr, W / 2, bottomY + 122)

      ctx.fillStyle = '#5a3a0a'
      ctx.font = '11px Georgia, serif'
      ctx.fillText('Marine Gouvernement Mondial — Brams Community', W / 2, H - 34)
      ctx.fillText('🏴‍☠️  BRAMS COMMUNITY', W / 2, H - 18)
    }

    if (currentPhoto) {
      const img = new Image()
      img.onload = () => drawAll(img)
      img.src = currentPhoto
    } else {
      drawAll(null)
    }
  }, [])

  const generate = () => {
    const newPrime = randomPrime()
    const newEpithet = EPITHETS[Math.floor(Math.random() * EPITHETS.length)]
    setPrime(newPrime)
    setEpithet(newEpithet)
    setGenerated(true)
    // Draw after state update via timeout to ensure canvas is visible
    setTimeout(() => drawPoster(newPrime, newEpithet, pseudo, photo), 50)
  }

  const download = () => {
    setDownloading(true)
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `wanted-${pseudo || 'pirate'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setTimeout(() => setDownloading(false), 1000)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhoto(ev.target.result)
      if (generated) {
        setTimeout(() => drawPoster(prime, epithet, pseudo, ev.target.result), 50)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <section id="wanted" style={{ padding: '110px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', left: '10%', bottom: '20%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,169,110,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="label">🎯 Générateur</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Avis de Recherche</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto' }}>Crée ton propre avis de recherche One Piece. Prime aléatoire, téléchargeable.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, maxWidth: 860, margin: '0 auto', alignItems: 'start' }}>
          {/* Formulaire */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Ton pseudo pirate</label>
              <input
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                placeholder="Monkey D. ..."
                maxLength={24}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  color: '#fff', fontSize: 15, fontFamily: 'var(--body)', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Photo (optionnel)</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current.click()} style={{
                width: '100%', padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'var(--card)', border: `1px dashed ${photo ? 'var(--accent)' : 'var(--border)'}`,
                color: photo ? 'var(--accent)' : 'var(--muted)', fontSize: 14, fontFamily: 'var(--body)',
                transition: 'all 0.2s',
              }}>
                {photo ? '✅ Photo chargée — cliquer pour changer' : '📷 Ajouter une photo'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generate} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                ⚔️ Générer
              </button>
              {generated && (
                <button onClick={download} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  {downloading ? '⏳' : '📥 Télécharger'}
                </button>
              )}
            </div>

            {generated && (
              <div style={{
                background: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.2)',
                borderRadius: 12, padding: '16px', fontSize: 13,
              }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Ta prime assignée</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{formatPrime(prime)}</div>
                <div style={{ fontSize: 11, color: '#c8a96e', marginTop: 4 }}>« {epithet} »</div>
              </div>
            )}
          </div>

          {/* Canvas preview */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {!generated ? (
              <div style={{
                width: 280, height: 375, background: 'var(--card)', borderRadius: 16,
                border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
                color: 'var(--muted)', fontSize: 14,
              }}>
                <div style={{ fontSize: 64 }}>🏴‍☠️</div>
                <p style={{ textAlign: 'center', padding: '0 24px', lineHeight: 1.6, fontSize: 13 }}>
                  Entre ton pseudo et clique sur Générer
                </p>
              </div>
            ) : null}
            <canvas ref={canvasRef} style={{
              display: generated ? 'block' : 'none',
              borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(200,169,110,0.15)',
              maxWidth: '100%',
              border: '1px solid rgba(200,169,110,0.2)',
            }} />
          </div>
        </div>
      </div>
    </section>
  )
}
