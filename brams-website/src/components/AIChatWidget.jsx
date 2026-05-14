import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'Quel est le fruit du démon le plus puissant ?',
  'Comment monter de rang sur Brams ?',
  'Qui peut battre Shanks ?',
]

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:5, padding:'10px 14px', background:'rgba(255,255,255,.06)', borderRadius:'14px 14px 14px 4px', width:'fit-content' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', display:'block', animation:`pulse 1.2s ${i*0.2}s infinite` }} />
      ))}
    </div>
  )
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [history, loading, open])

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const newHistory = [...history, { role:'user', text:msg }]
    setHistory(newHistory)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || 'Erreur.'
      setHistory(h => [...h, { role:'model', text: reply }])
      if (!open) setUnread(u => u + 1)
    } catch {
      setHistory(h => [...h, { role:'model', text:'Connexion impossible.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Panel */}
      <div style={{
        position:'fixed', bottom:90, right:24, zIndex:900,
        width:360, maxWidth:'calc(100vw - 48px)',
        background:'rgba(14,15,17,.96)', backdropFilter:'blur(20px)',
        border:'1px solid rgba(224,82,74,.2)', borderRadius:20,
        boxShadow:'0 24px 60px rgba(0,0,0,.6), 0 0 40px rgba(224,82,74,.08)',
        display:'flex', flexDirection:'column',
        maxHeight: open ? 520 : 0,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition:'max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s ease',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 18px', borderBottom:'1px solid rgba(255,255,255,.06)',
          background:'linear-gradient(90deg, rgba(224,82,74,.1), rgba(155,89,182,.06))',
          display:'flex', alignItems:'center', gap:12, flexShrink:0,
        }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#e0524a,#9b59b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>🏴‍☠️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'#fff', fontFamily:'var(--pirate)', letterSpacing:'.02em' }}>Brams Score IA</div>
            <div style={{ fontSize:11, color:'var(--success)', display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--success)', display:'inline-block', animation:'pulse 2s infinite' }} />
              En ligne
            </div>
          </div>
          {history.length > 0 && (
            <button onClick={() => setHistory([])} style={{ fontSize:11, color:'var(--muted)', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>
              Effacer
            </button>
          )}
          <button onClick={() => setOpen(false)} style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.04)', color:'var(--muted)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 8px' }}>
          {history.length === 0 && (
            <div style={{ textAlign:'center', padding:'24px 10px' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🏴‍☠️</div>
              <p style={{ color:'var(--muted)', fontSize:13, marginBottom:16 }}>Pose-moi n'importe quelle question sur One Piece ou le serveur Brams !</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    background:'rgba(224,82,74,.08)', border:'1px solid rgba(224,82,74,.2)',
                    borderRadius:10, padding:'8px 12px', fontSize:12, color:'rgba(255,255,255,.7)',
                    cursor:'pointer', textAlign:'left', transition:'all .15s',
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(224,82,74,.18)';e.currentTarget.style.color='#fff'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(224,82,74,.08)';e.currentTarget.style.color='rgba(255,255,255,.7)'}}
                  >💬 {s}</button>
                ))}
              </div>
            </div>
          )}
          {history.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', marginBottom:8 }}>
              {m.role === 'model' && (
                <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#e0524a,#9b59b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, marginRight:8, marginTop:2 }}>🏴‍☠️</div>
              )}
              <div style={{
                maxWidth:'80%', padding:'9px 13px',
                borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: m.role==='user' ? 'var(--accent)' : 'rgba(255,255,255,.06)',
                border: m.role==='user' ? 'none' : '1px solid rgba(255,255,255,.07)',
                fontSize:13, lineHeight:1.6, color:'#fff', whiteSpace:'pre-wrap', wordBreak:'break-word',
              }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <div style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#e0524a,#9b59b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🏴‍☠️</div>
              <TypingDots />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', gap:8, flexShrink:0 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
            placeholder="Pose ta question…"
            maxLength={500}
            style={{ flex:1, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'9px 14px', fontSize:13, color:'#fff', outline:'none', fontFamily:'var(--body)' }}
            onFocus={e=>e.target.style.borderColor='rgba(224,82,74,.4)'}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.08)'}
          />
          <button onClick={() => send()} disabled={!input.trim()||loading}
            style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:input.trim()&&!loading?'var(--accent)':'rgba(255,255,255,.06)', border:'none', color:'#fff', fontSize:16, cursor:input.trim()&&!loading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s' }}>
            →
          </button>
        </div>
      </div>

      {/* Bubble button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:'fixed', bottom:24, right:24, zIndex:901,
          width:58, height:58, borderRadius:'50%',
          background:'linear-gradient(135deg, #e0524a, #9b59b6)',
          border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:26,
          boxShadow:'0 8px 32px rgba(224,82,74,.45)',
          transition:'transform .2s, box-shadow .2s',
        }}
        onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.1)';e.currentTarget.style.boxShadow='0 12px 40px rgba(224,82,74,.6)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='0 8px 32px rgba(224,82,74,.45)'}}
      >
        {open ? '✕' : '🏴‍☠️'}
        {!open && unread > 0 && (
          <span style={{ position:'absolute', top:0, right:0, width:20, height:20, borderRadius:'50%', background:'var(--accent)', border:'2px solid #0e0f11', fontSize:11, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>{unread}</span>
        )}
      </button>
    </>
  )
}
