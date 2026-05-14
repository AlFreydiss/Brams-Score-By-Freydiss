import { useState, useRef, useEffect } from 'react'
import { useInView } from '../hooks/useInView.js'

const SUGGESTIONS = [
  'C\'est quoi le fruit du démon le plus puissant ?',
  'Explique-moi le système de rangs Brams',
  'Qui est le personnage le plus fort de One Piece ?',
  'Comment gagner des Berrys sur le serveur ?',
]

function Msg({ m }) {
  const isUser = m.role === 'user'
  return (
    <div style={{
      display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom:12, animation:'fadeUp .3s ease-out',
    }}>
      {!isUser && (
        <div style={{
          width:32, height:32, borderRadius:10, flexShrink:0, marginRight:10, marginTop:2,
          background:'linear-gradient(135deg,#e0524a,#9b59b6)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
        }}>🏴‍☠️</div>
      )}
      <div style={{
        maxWidth:'78%', padding:'10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--accent)' : 'rgba(255,255,255,.06)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,.08)',
        fontSize:14, lineHeight:1.6, color:'#fff',
        whiteSpace:'pre-wrap', wordBreak:'break-word',
      }}>
        {m.text}
      </div>
    </div>
  )
}

export default function AIChat() {
  const [ref, inView] = useInView()
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [history, loading])

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
      setHistory(h => [...h, { role:'model', text: data.reply || data.error || 'Erreur.' }])
    } catch {
      setHistory(h => [...h, { role:'model', text:'Connexion impossible, réessaie.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{ position:'relative', background:'transparent' }} ref={ref}>
      <div className="orb" style={{ width:400, height:400, top:'10%', right:'-5%', background:'rgba(224,82,74,.06)', pointerEvents:'none' }} />

      <div className="container">
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div className={`reveal ${inView?'visible':''}`}>
            <div className="label">Intelligence artificielle</div>
            <h2 className="h2" style={{ margin:'0 auto 16px' }}>
              Brams Score IA
            </h2>
            <p className="sub" style={{ margin:'0 auto' }}>
              Pose tes questions sur One Piece, les animes ou le serveur. Propulsé par Gemini.
            </p>
          </div>
        </div>

        <div className={`reveal ${inView?'visible':''}`} style={{ maxWidth:680, margin:'0 auto' }}>
          {/* Chat box */}
          <div style={{
            background:'rgba(17,18,20,.7)', backdropFilter:'blur(16px)',
            border:'1px solid rgba(255,255,255,.08)', borderRadius:20,
            overflow:'hidden',
            boxShadow:'0 24px 60px rgba(0,0,0,.4)',
          }}>
            {/* Header */}
            <div style={{
              padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,.06)',
              display:'flex', alignItems:'center', gap:12,
              background:'linear-gradient(90deg, rgba(224,82,74,.08), rgba(155,89,182,.06))',
            }}>
              <div style={{
                width:38, height:38, borderRadius:12,
                background:'linear-gradient(135deg,#e0524a,#9b59b6)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
              }}>🏴‍☠️</div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#fff' }}>Brams Score IA</div>
                <div style={{ fontSize:12, color:'var(--success)', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)', display:'inline-block', animation:'pulse 2s infinite' }} />
                  En ligne · Gemini
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ height:380, overflowY:'auto', padding:'20px 20px 10px' }}>
              {history.length === 0 && (
                <div style={{ textAlign:'center', paddingTop:60 }}>
                  <div style={{ fontSize:40, marginBottom:16 }}>🏴‍☠️</div>
                  <p style={{ color:'var(--muted)', fontSize:14 }}>Yo ! Pose-moi n'importe quelle question sur One Piece, les animes ou le serveur Brams.</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:24 }}>
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => send(s)} style={{
                        background:'rgba(224,82,74,.1)', border:'1px solid rgba(224,82,74,.25)',
                        borderRadius:100, padding:'6px 14px', fontSize:12, color:'rgba(255,255,255,.7)',
                        cursor:'pointer', transition:'all .15s',
                      }}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(224,82,74,.2)';e.currentTarget.style.color='#fff'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(224,82,74,.1)';e.currentTarget.style.color='rgba(255,255,255,.7)'}}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {history.map((m, i) => <Msg key={i} m={m} />)}
              {loading && (
                <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#e0524a,#9b59b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🏴‍☠️</div>
                  <div style={{ padding:'12px 16px', borderRadius:'14px 14px 14px 4px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', display:'flex', gap:5, alignItems:'center' }}>
                    {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', display:'block', animation:`pulse 1.2s ${i*0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', gap:10 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Pose ta question…"
                maxLength={500}
                style={{
                  flex:1, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:12, padding:'10px 16px', fontSize:14, color:'#fff',
                  outline:'none', fontFamily:'var(--body)',
                }}
                onFocus={e=>e.target.style.borderColor='rgba(224,82,74,.5)'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.1)'}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  width:44, height:44, borderRadius:12, flexShrink:0,
                  background: input.trim() && !loading ? 'var(--accent)' : 'rgba(255,255,255,.06)',
                  border:'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'background .15s, transform .1s',
                }}
                onMouseEnter={e=>{ if(input.trim()&&!loading) e.currentTarget.style.transform='scale(1.08)' }}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
              >→</button>
            </div>
          </div>

          <p style={{ textAlign:'center', marginTop:14, fontSize:12, color:'var(--muted)' }}>
            L'IA peut se tromper · Ne partage jamais d'infos personnelles
          </p>
        </div>
      </div>
    </section>
  )
}
