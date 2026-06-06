// Bandeau d'endossement compact « Recommandé par Freydiss & Hakuji ».
// Partagé entre les pages d'animés.
// withHakuji : ajoute Hakuji à côté de Freydiss (réservé à Violet Evergarden).
export default function RecommendedBanner({ color2 = '#b8a8ff', withHakuji = false }) {
  const Av = ({ icon, c }) => (
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${c}, rgba(0,0,0,.4))`, border: `1.5px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, boxShadow: `0 3px 10px ${c}55`, flexShrink: 0 }}>{icon}</div>
  )
  return (
    <div style={{
      marginTop: 22, borderRadius: 14, padding: '12px 18px', position: 'relative', overflow: 'hidden',
      display: 'inline-flex', alignItems: 'center', gap: 14, maxWidth: '100%',
      background: `linear-gradient(120deg, ${withHakuji ? 'rgba(229,86,74,.12)' : `${color2}1f`}, ${color2}26 70%, rgba(14,12,24,.6))`,
      border: `1px solid ${color2}48`,
    }}>
      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '1.4px', textTransform: 'uppercase', color: color2, flexShrink: 0 }}>★ Coup de cœur</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: 'rgba(255,255,255,.9)' }}>
        Recommandé par <span style={{ color: color2 }}>Freydiss</span>
        {withHakuji && <> &amp; <span style={{ color: '#ff7a6b' }}>Hakuji</span></>}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: 2 }}>
        <Av icon="👑" c={color2} />
        {withHakuji && <div style={{ marginLeft: -8 }}><Av icon="🔥" c="#ff7a6b" /></div>}
      </div>
    </div>
  )
}
