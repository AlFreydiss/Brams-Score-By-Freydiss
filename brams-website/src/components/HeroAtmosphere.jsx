import { useEffect, useRef } from 'react'

// ── Static world data ──────────────────────────────────────────────────────
const MOTES = Array.from({ length: 20 }, (_, i) => ({
  left:     `${3  + (i * 29 % 90)}%`,
  bottom:   `${8  + (i * 19 % 40)}%`,
  delay:    `${(i * 0.9) % 14}s`,
  duration: `${9  + (i * 1.1 % 7)}s`,
  dx:       `${(i % 2 === 0 ? 1 : -1) * (5 + i % 14)}px`,
  size:     `${1.5 + (i % 3) * 0.7}px`,
}))

const BIRDS = [
  { top: '33%', delay: '0s',   dur: '28s', s: 0.7  },
  { top: '29%', delay: '9s',   dur: '34s', s: 0.52 },
  { top: '36%', delay: '18s',  dur: '23s', s: 0.85 },
  { top: '31%', delay: '5s',   dur: '40s', s: 0.55 },
  { top: '27%', delay: '24s',  dur: '29s', s: 0.64 },
]

const CLOUDS = [
  { w: 340, h: 80,  top: '10%', left: '-3%',  delay: '0s',   dur: '42s', op: 0.72, blur: 12 },
  { w: 420, h: 100, top: '16%', left: '38%',  delay: '-15s', dur: '56s', op: 0.55, blur: 16 },
  { w: 260, h: 65,  top: '7%',  left: '68%',  delay: '-8s',  dur: '36s', op: 0.50, blur: 10 },
  { w: 380, h: 90,  top: '21%', left: '18%',  delay: '-26s', dur: '50s', op: 0.38, blur: 18 },
  { w: 210, h: 55,  top: '13%', left: '83%',  delay: '-4s',  dur: '31s', op: 0.34, blur: 8  },
]

// ── Self-contained CSS ─────────────────────────────────────────────────────
const HAC_CSS = `
/* ── Keyframes ── */
@keyframes hac-wave    { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes hac-cloud   { from{transform:translateX(0)} to{transform:translateX(16%)} }
@keyframes hac-fog     {
  0%,100%{transform:translateX(0);    opacity:.42;}
  50%    {transform:translateX(4%);   opacity:.68;}
}
@keyframes hac-bob     {
  0%,100%{transform:translateY(0)  rotate(-.38deg);}
  50%    {transform:translateY(-9px) rotate(.38deg);}
}
@keyframes hac-bird    {
  0%  {transform:translateX(-8vw)  translateY(0);    opacity:0;}
  6%  {opacity:1;}
  94% {opacity:1;}
  100%{transform:translateX(115vw) translateY(-4vh); opacity:0;}
}
@keyframes hac-ray     { 0%,100%{opacity:.025;} 50%{opacity:.07;} }
@keyframes hac-mote    {
  0%  {transform:translateY(0)    translateX(0);                opacity:0;}
  12% {opacity:1;}
  88% {opacity:.6;}
  100%{transform:translateY(-80px) translateX(var(--mx,12px)); opacity:0;}
}
@keyframes hac-rain    {
  from{transform:rotate(7deg) translateY(-120%);}
  to  {transform:rotate(7deg) translateY(180vh);}
}
@keyframes hac-glow    { 0%,100%{opacity:.75;transform:scale(1);}   50%{opacity:1;transform:scale(1.06);} }
@keyframes hac-shimmer { 0%,100%{opacity:.38;}  50%{opacity:.8;} }
@keyframes hac-horizon { 0%,100%{opacity:.55;}  50%{opacity:.9;} }

/* ── Root ── */
.hac-root {
  position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;
}

/* ── Sky ── */
.hac-sky {
  position:absolute;inset:0;
  background:linear-gradient(
    to bottom,
    #030710  0%,
    #06101e 12%,
    #0b1c38 26%,
    #132840 40%,
    #1c3554 47%,
    #2a4e7e 49.2%,
    #c05a12 50.0%,
    #7a2808 51.0%,
    #0e1c30 55%,
    #08121e 70%,
    #030810 100%
  );
}

/* ── Sun system ── */
.hac-sun-wrap {
  position:absolute;left:66%;top:47%;width:0;height:0;will-change:transform;
}
.hac-sun-corona {
  position:absolute;width:380px;height:380px;
  transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle,rgba(210,100,20,.22) 0%,rgba(180,70,10,.10) 35%,transparent 65%);
  animation:hac-glow 5s ease-in-out infinite;
}
.hac-sun-disc {
  position:absolute;width:68px;height:68px;
  transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle,rgba(255,175,65,1) 0%,rgba(255,135,22,.75) 42%,rgba(200,80,10,.15) 70%,transparent);
  animation:hac-glow 3.5s ease-in-out infinite;
}
.hac-sun-ray {
  position:absolute;left:0;top:0;transform-origin:0 0;
  height:1100px;width:1px;
  background:linear-gradient(to bottom,rgba(225,140,40,.10),transparent);
  animation:hac-ray 4s ease-in-out infinite;
}
.hac-ray-0{transform:rotate(-20deg);animation-delay:0s;}
.hac-ray-1{transform:rotate(-13deg);animation-delay:.6s;width:2px;}
.hac-ray-2{transform:rotate(-5deg); animation-delay:1.2s;}
.hac-ray-3{transform:rotate(3deg);  animation-delay:1.8s;width:2px;}
.hac-ray-4{transform:rotate(11deg); animation-delay:2.4s;}
.hac-ray-5{transform:rotate(19deg); animation-delay:3s;}

/* ── Horizon ── */
.hac-horizon {
  position:absolute;left:0;right:0;top:calc(50% - 1px);height:4px;
  background:linear-gradient(90deg,transparent 0%,rgba(180,80,15,.25) 20%,rgba(225,145,42,.55) 50%,rgba(180,80,15,.25) 80%,transparent);
  filter:blur(3px);animation:hac-horizon 4.5s ease-in-out infinite;
}

/* ── Clouds ── */
.hac-cloud-wrap{position:absolute;inset:0;will-change:transform;}
.hac-cloud {
  position:absolute;
  border-radius:38% 62% 55% 45% / 65% 40% 60% 35%;
  background:rgba(12,22,46,.94);
  animation:hac-cloud linear infinite;
}

/* ── Ocean ── */
.hac-ocean{position:absolute;bottom:0;left:0;right:0;height:46%;overflow:hidden;}
.hac-wave {
  position:absolute;bottom:0;left:0;width:200%;height:100%;
  background-repeat:repeat-x;background-size:50% 100%;
}
.hac-wave-a {
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 80'%3E%3Cpath fill='%230a172e' d='M0 40 Q100 18 200 38 T400 38 T600 38 T800 38 L800 80 L0 80Z'/%3E%3C/svg%3E");
  animation:hac-wave 22s linear infinite;opacity:.8;
}
.hac-wave-b {
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 80'%3E%3Cpath fill='%230d1e3a' d='M0 48 Q80 28 160 46 T320 46 T480 48 T640 46 T800 48 L800 80 L0 80Z'/%3E%3C/svg%3E");
  animation:hac-wave 14s -4s linear infinite;opacity:.65;bottom:6%;
}
.hac-wave-c {
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 80'%3E%3Cpath fill='%23081524' d='M0 55 Q60 35 120 52 T240 52 T360 52 T480 52 T600 52 T720 52 T800 52 L800 80 L0 80Z'/%3E%3C/svg%3E");
  animation:hac-wave 9s -2s linear infinite;bottom:12%;opacity:.5;
}
.hac-ocean-glow {
  position:absolute;inset:0;
  background:linear-gradient(to bottom,rgba(195,95,25,.08) 0%,rgba(170,75,15,.04) 30%,transparent 60%);
  animation:hac-shimmer 7s ease-in-out infinite;
}

/* ── Ship ── */
.hac-ship-wrap {
  position:absolute;left:52%;top:26%;width:280px;
  animation:hac-bob 7s ease-in-out infinite;will-change:transform;
}
.hac-ship {
  width:100%;height:auto;display:block;
  filter:drop-shadow(0 8px 32px rgba(0,0,0,.65)) drop-shadow(0 0 50px rgba(4,10,22,.9));
}
.hac-lantern {
  position:absolute;border-radius:50%;animation:hac-glow 2.2s ease-in-out infinite;
}
.hac-lantern-a {
  width:12px;height:12px;left:32px;top:118px;
  background:radial-gradient(circle,rgba(255,185,65,.9),rgba(255,135,22,.3) 60%,transparent);
  box-shadow:0 0 12px rgba(255,155,42,.55);
}
.hac-lantern-b {
  width:9px;height:9px;left:218px;top:72px;
  background:radial-gradient(circle,rgba(255,175,55,.8),rgba(255,125,20,.2) 60%,transparent);
  box-shadow:0 0 9px rgba(255,145,40,.42);animation-delay:.9s;
}

/* ── Fog ── */
.hac-fog{position:absolute;left:-15%;width:130%;pointer-events:none;border-radius:50%;}
.hac-fog-a{height:200px;top:43%;background:radial-gradient(ellipse 65% 100% at 50% 50%,rgba(22,52,90,.22),transparent);animation:hac-fog 25s ease-in-out infinite;}
.hac-fog-b{height:160px;top:47%;background:radial-gradient(ellipse 55% 100% at 50% 50%,rgba(16,42,70,.16),transparent);animation:hac-fog 33s ease-in-out infinite reverse;animation-delay:-10s;}
.hac-fog-c{height:240px;top:39%;background:radial-gradient(ellipse 75% 100% at 50% 50%,rgba(28,58,95,.11),transparent);animation:hac-fog 44s ease-in-out infinite;animation-delay:-18s;}

/* ── Rain (single-element, CSS pattern) ── */
.hac-rain {
  position:absolute;inset:0;overflow:hidden;
  background-image:repeating-linear-gradient(
    83deg,
    transparent       0px,
    transparent       2px,
    rgba(150,200,240,.055) 2px,
    rgba(150,200,240,.055) 3px
  );
  background-size:7px 55px;
  animation:hac-rain .7s linear infinite;
}

/* ── Light motes ── */
.hac-mote {
  position:absolute;border-radius:50%;
  background:radial-gradient(circle,rgba(212,160,23,.95),rgba(212,160,23,.18) 55%,transparent);
  box-shadow:0 0 5px rgba(212,160,23,.5);
  animation:hac-mote ease-out infinite;
  will-change:transform,opacity;
}

/* ── Birds ── */
.hac-bird-wrap{position:absolute;left:-6%;animation:hac-bird linear infinite;will-change:transform;}

/* ── Vignette ── */
.hac-vignette {
  position:absolute;inset:0;
  background:
    radial-gradient(ellipse 110% 80% at 50% 50%,transparent 28%,rgba(2,6,14,.78) 100%),
    linear-gradient(to bottom,rgba(3,7,14,.58) 0%,transparent 18%,transparent 70%,rgba(3,7,14,.92) 100%);
  pointer-events:none;
}

/* ── Mobile ── */
@media(max-width:768px){
  .hac-ship-wrap{display:none;}
  .hac-cloud{opacity:.4 !important;}
}
`

// ── Ship SVG silhouette ────────────────────────────────────────────────────
function ShipSVG() {
  const hull   = '#07101e'
  const dark   = '#040c18'
  const sail   = 'rgba(10,20,40,.90)'
  const rope   = 'rgba(155,125,75,.20)'
  const amber  = 'rgba(255,165,42,.14)'

  return (
    <svg className="hac-ship" viewBox="0 0 280 210" xmlns="http://www.w3.org/2000/svg">
      {/* Bowsprit */}
      <line x1="50" y1="150" x2="-18" y2="105" stroke={rope} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="-18" y1="105" x2="50" y2="140" stroke={rope} strokeWidth="1" opacity=".5"/>

      {/* Rigging */}
      <line x1="118" y1="16" x2="50" y2="150"  stroke={rope} strokeWidth="1.2"/>
      <line x1="118" y1="16" x2="165" y2="32"  stroke={rope} strokeWidth="1.2"/>
      <line x1="165" y1="32" x2="210" y2="150" stroke={rope} strokeWidth="1"/>
      <line x1="118" y1="50" x2="165" y2="55"  stroke={rope} strokeWidth=".8"/>
      <line x1="118" y1="85" x2="165" y2="85"  stroke={rope} strokeWidth=".8"/>

      {/* Yard arms */}
      <line x1="86"  y1="42" x2="152" y2="42" stroke={rope} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="92"  y1="78" x2="146" y2="78" stroke={rope} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="138" y1="55" x2="194" y2="55" stroke={rope} strokeWidth="2"   strokeLinecap="round"/>

      {/* Main mast */}
      <rect x="115" y="11" width="6" height="142" fill={hull} rx="1"/>

      {/* Fore mast */}
      <rect x="162" y="27" width="5" height="126" fill={hull} rx="1"/>

      {/* Upper main sail */}
      <path d="M118 14 Q160 32 120 72" fill={sail}/>

      {/* Lower main sail */}
      <path d="M118 80 Q156 96 120 122" fill={sail} opacity=".88"/>

      {/* Fore sail */}
      <path d="M164 29 Q198 48 166 78" fill={sail} opacity=".82"/>

      {/* Hull */}
      <path d="M36 158 Q140 172 244 158 L250 183 Q140 197 30 183 Z" fill={hull}/>

      {/* Deck rail */}
      <path d="M36 158 Q140 153 244 158" fill="none" stroke={dark} strokeWidth="1.8"/>

      {/* Stern castle */}
      <path d="M205 122 L250 122 L250 158 L205 158 Z" fill={dark}/>
      <path d="M208 108 L246 108 L246 124 L208 124 Z" fill={hull}/>
      <path d="M210 94"  fill="none"/>
      <path d="M210 94 L244 94 L244 110 L210 110 Z"  fill={dark}/>
      <path d="M212 82 L240 82 L240 96 L212 96 Z"   fill={hull}/>

      {/* Cabin windows */}
      <rect x="218" y="88" width="6" height="5" rx="1" fill={amber}/>
      <rect x="228" y="88" width="6" height="5" rx="1" fill={amber}/>
      <rect x="218" y="112" width="5" height="5" rx="1" fill={amber}/>
      <rect x="228" y="112" width="5" height="5" rx="1" fill={amber}/>

      {/* Stern lantern */}
      <circle cx="227" cy="78" r="6"   fill="rgba(255,175,55,.18)"/>
      <circle cx="227" cy="78" r="3"   fill="rgba(255,175,55,.5)"/>
      <circle cx="227" cy="78" r="1.5" fill="rgba(255,210,90,.75)"/>

      {/* Portholes */}
      <circle cx="88"  cy="163" r="5" fill="none" stroke={dark} strokeWidth="1.5"/>
      <circle cx="118" cy="163" r="5" fill="none" stroke={dark} strokeWidth="1.5"/>
      <circle cx="150" cy="163" r="5" fill="none" stroke={dark} strokeWidth="1.5"/>
      <circle cx="182" cy="163" r="5" fill="none" stroke={dark} strokeWidth="1.5"/>

      {/* Flag */}
      <line x1="118" y1="11" x2="118" y2="3" stroke={hull} strokeWidth="1.5"/>
      <path d="M118 3 L136 -1 L130 7 Z" fill={hull}/>
      <circle cx="127" cy="2" r="2.5" fill="rgba(255,255,255,.10)"/>

      {/* Bow */}
      <path d="M36 166 Q22 160 8 158" fill="none" stroke={dark} strokeWidth="2.5" strokeLinecap="round"/>

      {/* Bow lantern */}
      <circle cx="44" cy="145" r="7"   fill="rgba(255,165,42,.14)"/>
      <circle cx="44" cy="145" r="3.5" fill="rgba(255,165,42,.38)"/>
      <circle cx="44" cy="145" r="1.8" fill="rgba(255,205,85,.78)"/>
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function HeroAtmosphere() {
  const rootRef = useRef(null)
  const state   = useRef({ tx: 0, ty: 0, cx: 0, cy: 0, id: 0 })

  // Inject CSS once
  useEffect(() => {
    const id = 'hac-world-css'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = HAC_CSS
    document.head.appendChild(el)
    return () => document.getElementById(id)?.remove()
  }, [])

  // Mouse parallax
  useEffect(() => {
    const s    = state.current
    const root = rootRef.current
    if (!root) return

    const onMove = (e) => {
      s.tx = e.clientX / window.innerWidth  - 0.5
      s.ty = e.clientY / window.innerHeight - 0.5
    }
    const tick = () => {
      const ease = 0.04
      s.cx += (s.tx - s.cx) * ease
      s.cy += (s.ty - s.cy) * ease
      root.style.setProperty('--p1x', `${(s.cx * 10).toFixed(2)}px`)
      root.style.setProperty('--p1y', `${(s.cy *  7).toFixed(2)}px`)
      root.style.setProperty('--p2x', `${(s.cx * 20).toFixed(2)}px`)
      root.style.setProperty('--p2y', `${(s.cy * 13).toFixed(2)}px`)
      root.style.setProperty('--p3x', `${(s.cx *  5).toFixed(2)}px`)
      root.style.setProperty('--p3y', `${(s.cy *  3).toFixed(2)}px`)
      s.id = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    s.id = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(s.id)
    }
  }, [])

  return (
    <div ref={rootRef} className="hac-root" aria-hidden="true">

      {/* Sky gradient */}
      <div className="hac-sky" />

      {/* Sun + god rays — deep parallax */}
      <div className="hac-sun-wrap" style={{ transform: 'translate(var(--p3x,0),var(--p3y,0))' }}>
        <div className="hac-sun-corona" />
        <div className="hac-sun-disc"   />
        <div className="hac-sun-ray hac-ray-0" />
        <div className="hac-sun-ray hac-ray-1" />
        <div className="hac-sun-ray hac-ray-2" />
        <div className="hac-sun-ray hac-ray-3" />
        <div className="hac-sun-ray hac-ray-4" />
        <div className="hac-sun-ray hac-ray-5" />
      </div>

      {/* Horizon line */}
      <div className="hac-horizon" />

      {/* Clouds — mid parallax */}
      <div className="hac-cloud-wrap" style={{ transform: 'translate(var(--p1x,0),var(--p1y,0))' }}>
        {CLOUDS.map((c, i) => (
          <div key={i} className="hac-cloud" style={{
            width: c.w, height: c.h, top: c.top, left: c.left,
            opacity: c.op, filter: `blur(${c.blur}px)`,
            animationDelay: c.delay, animationDuration: c.dur,
          }} />
        ))}
      </div>

      {/* Ocean + waves */}
      <div className="hac-ocean">
        <div className="hac-wave hac-wave-a" />
        <div className="hac-wave hac-wave-b" />
        <div className="hac-wave hac-wave-c" />
        <div className="hac-ocean-glow"      />
      </div>

      {/* Ship — close parallax */}
      <div className="hac-ship-wrap" style={{ transform: 'translate(var(--p2x,0),var(--p2y,0))' }}>
        <ShipSVG />
        <div className="hac-lantern hac-lantern-a" />
        <div className="hac-lantern hac-lantern-b" />
      </div>

      {/* Fog layers */}
      <div className="hac-fog hac-fog-a" />
      <div className="hac-fog hac-fog-b" />
      <div className="hac-fog hac-fog-c" />

      {/* Rain (single CSS pattern element) */}
      <div className="hac-rain" />

      {/* Floating light motes */}
      {MOTES.map((m, i) => (
        <div key={i} className="hac-mote" style={{
          left: m.left, bottom: m.bottom,
          width: m.size, height: m.size,
          '--mx': m.dx,
          animationDelay: m.delay,
          animationDuration: m.duration,
        }} />
      ))}

      {/* Distant birds */}
      {BIRDS.map((b, i) => (
        <div key={i} className="hac-bird-wrap"
          style={{ top: b.top, animationDelay: b.delay, animationDuration: b.dur }}>
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none"
            style={{ transform: `scale(${b.s})`, transformOrigin: 'center' }}>
            <path d="M1 6 Q5.5 1 11 5 Q16.5 1 21 6"
              stroke="rgba(155,190,220,.32)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      ))}

      {/* Vignette */}
      <div className="hac-vignette" />

    </div>
  )
}
