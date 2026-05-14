import { useInView } from '../hooks/useInView.js'

const FEATURES = [
  { emoji:'💰', title:'Économie Berry',    color:'#FFD700', desc:'Gagne des Berrys en étant actif en vocal. Dépose-les en banque, surveille ta fortune.',              cmds:['/banque','/retrait','/depot'] },
  { emoji:'📊', title:'Stats vocales',     color:'#3B82F6', desc:'Suis tes heures vocales en temps réel. Vois combien il te reste pour atteindre le rang suivant.',       cmds:['/stats'] },
  { emoji:'🏆', title:'Classement',        color:'#E0524A', desc:'Qui domine le serveur cette semaine ? Consulte le top vocal et le top Berry en direct.',                cmds:['/top'] },
  { emoji:'🎯', title:'Quiz Animé',        color:'#34D399', desc:'Des questions sur One Piece, Naruto, Dragon Ball et des dizaines d\'autres animes. Teste ta culture.',  cmds:['/question'] },
  { emoji:'🏦', title:'Banque & Coffre',   color:'#9B59B6', desc:'Gère ton coffre, surveille tes revenus passifs et ta fortune accumulée semaine après semaine.',          cmds:['/banque','/coffre','/virement'] },
  { emoji:'👤', title:'Profil & Wanted',   color:'#F97316', desc:'Personnalise ton profil, génère ta fiche d\'avis de recherche et affiche ta prime aux autres membres.', cmds:['/monprofil','/modifprofil'] },
]

export default function BotFeatures() {
  const [ref, inView] = useInView()

  return (
    <section id="bot" style={{ position:'relative' }}>
      <div className="orb" style={{ width:500, height:500, top:'20%', right:'-10%', background:'rgba(224,82,74,.06)', pointerEvents:'none' }} />

      <div className="container" ref={ref}>
        <div style={{ marginBottom:64 }}>
          <div className={`reveal ${inView?'visible':''}`}>
            <div className="label">Bot Brams Score</div>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
              <div>
                <h2 className="h2">Tout ce que Brams Score peut faire</h2>
                <p className="sub">Un bot 100% custom. Économie, classements, quiz, profils — tout est pensé pour la communauté.</p>
              </div>
              <div style={{
                display:'flex', alignItems:'center', gap:8,
                background:'rgba(52,211,153,.08)', border:'1px solid rgba(52,211,153,.2)',
                borderRadius:10, padding:'9px 18px',
              }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--success)', boxShadow:'0 0 8px #34d399', animation:'pulse 2s infinite' }} />
                <span style={{ fontSize:13, color:'var(--success)', fontWeight:600 }}>Brams Score en ligne</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`reveal reveal-${(i%4)+1} ${inView?'visible':''}`}
              style={{
                padding:26, borderRadius:16, position:'relative', overflow:'hidden',
                background:`linear-gradient(135deg, ${f.color}10 0%, rgba(17,18,20,0.9) 60%)`,
                border:`1px solid ${f.color}35`,
                transition:'transform .2s, box-shadow .2s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow=`0 16px 40px ${f.color}20`}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}
            >
              <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:`${f.color}08`, filter:'blur(20px)', pointerEvents:'none' }} />
              <div style={{
                width:52, height:52, borderRadius:14, marginBottom:18,
                background:`${f.color}20`, border:`1px solid ${f.color}40`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
                boxShadow:`0 4px 16px ${f.color}20`,
              }}>{f.emoji}</div>
              <h3 style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:17, color:'#fff', marginBottom:10 }}>{f.title}</h3>
              <p style={{ fontSize:13.5, color:'var(--muted)', lineHeight:1.7, marginBottom:18 }}>{f.desc}</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {f.cmds.map(c => (
                  <span key={c} style={{
                    background:`${f.color}12`, border:`1px solid ${f.color}30`,
                    borderRadius:6, padding:'3px 10px', fontSize:12, color:f.color, fontFamily:'monospace',
                  }}>{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
