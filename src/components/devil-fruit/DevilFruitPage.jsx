import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── INLINE SVG ICONS (no external dep) ─────────────────────────────────────
function Ico({ name, size = 16, color = 'currentColor', style: s }) {
  const p = {
    search:      <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    grid:        <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
    list:        <><path d="M3 12h18M3 6h18M3 18h18"/></>,
    compact:     <><rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="3" y="10" width="7" height="5" rx="1"/><rect x="14" y="10" width="7" height="5" rx="1"/><rect x="3" y="17" width="7" height="4" rx="1"/><rect x="14" y="17" width="7" height="4" rx="1"/></>,
    layers:      <><polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/></>,
    wind:        <><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 1 11 16H2"/></>,
    zap:         <><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></>,
    paw:         <><circle cx="11" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="6" cy="8" r="2"/><circle cx="18" cy="8" r="2"/><path d="M12 20c-3.3 0-6-2.5-6-5.5 0-1.5.7-2.8 1.8-3.8L12 8l4.2 2.7c1.1 1 1.8 2.3 1.8 3.8C18 17.5 15.3 20 12 20z"/></>,
    crown:       <><path d="M2 20h20"/><path d="M5 20V8l7-6 7 6v12"/><path d="M12 2v6"/></>,
    sparkles:    <><path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></>,
    lock:        <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    sort:        <><path d="M8 15l4 4 4-4"/><path d="M16 9l-4-4-4 4"/></>,
    folder:      <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="2" y1="10" x2="22" y2="10"/></>,
    star:        <><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></>,
    x:           <><path d="M18 6 6 18M6 6l12 12"/></>,
    eye:         <><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
    eyeoff:      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/></>,
    anchor:      <><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="22"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></>,
    settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display:'inline-block', flexShrink:0, ...s }}>
      {p[name]}
    </svg>
  )
}

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const RM = {
  legendaire: { label:'Légendaire', color:'#EAB308', glow:'rgba(234,179,8,0.4)',  bg:'rgba(234,179,8,0.07)',  order:1 },
  mythique:   { label:'Mythique',   color:'#A855F7', glow:'rgba(168,85,247,0.4)', bg:'rgba(168,85,247,0.07)', order:2 },
  classifie:  { label:'CLASSIFIÉ',  color:'#9F1239', glow:'rgba(159,18,57,0.5)',  bg:'rgba(159,18,57,0.07)',  order:3 },
  epique:     { label:'Épique',     color:'#3B82F6', glow:'rgba(59,130,246,0.35)',bg:'rgba(59,130,246,0.06)', order:4 },
  rare:       { label:'Rare',       color:'#10B981', glow:'rgba(16,185,129,0.35)',bg:'rgba(16,185,129,0.06)', order:5 },
  commun:     { label:'Commun',     color:'#6B7280', glow:'rgba(107,114,128,0.2)',bg:'rgba(107,114,128,0.05)',order:6 },
}
const TM = {
  'Logia':    { color:'#3B82F6' },
  'Paramecia':{ color:'#10B981' },
  'Zoan':     { color:'#F97316' },
  '???':      { color:'#9F1239' },
}
function hexRgb(hex) {
  const h = hex.replace('#','')
  if (h.length === 3) return `${parseInt(h[0]+h[0],16)},${parseInt(h[1]+h[1],16)},${parseInt(h[2]+h[2],16)}`
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const FRUITS = [
  { id:1,  name:'Magu Magu no Mi',            type:'Logia',    rarity:'legendaire', user:'Sakazuki — Akainu',          emoji:'🌋', power:97, colors:['#7f1d1d','#450a0a'], classified:false, spoiler:false,
    desc:"Le fruit le plus offensif des Logia. Le magma dépasse même les flammes.", tags:['Offensif','Amiral','Marine'],
    lore:"Sakazuki, Amiral en Chef, a tué Portgas D. Ace d'un seul coup. Son magma atteint 1 200°C et consume le feu. Principe absolu : l'Élimination totale." },
  { id:2,  name:'Hie Hie no Mi',              type:'Logia',    rarity:'legendaire', user:'Kuzan — Aokiji',             emoji:'🧊', power:93, colors:['#0c4a6e','#0f172a'], classified:false, spoiler:false,
    desc:"Transforme en glace. Peut geler des mers entières en quelques secondes.", tags:['Contrôle','Zone','Ancien Amiral'],
    lore:"Kuzan a gelé l'archipel de Punk Hazard lors de son affrontement de 10 jours contre Akainu. Il parcourt désormais le monde à bicyclette, lié mystérieusement à Barbe Noire." },
  { id:3,  name:'Goro Goro no Mi',            type:'Logia',    rarity:'legendaire', user:'Enel',                       emoji:'⚡', power:91, colors:['#713f12','#422006'], classified:false, spoiler:false,
    desc:"Maîtrise absolue de la foudre. Enel se proclamait dieu de Skypiea.", tags:['Vitesse','Omniscience','Skypiea'],
    lore:"Enel pouvait lire les ondes électriques dans un rayon de 6 400 km. Sa défaite contre Luffy — corps en caoutchouc — reste l'une des plus grandes surprises du manga." },
  { id:4,  name:'Mera Mera no Mi',            type:'Logia',    rarity:'legendaire', user:'Portgas D. Ace → Sabo',      emoji:'🔥', power:89, colors:['#7c2d12','#431407'], classified:false, spoiler:false,
    desc:"Maîtrise du feu. Flammes vives capables de consumer presque tout.", tags:['Feu','Révolutionnaire','Héritage'],
    lore:"Fruit originel d'Ace, fils du Roi des Pirates. Passé à Sabo lors du tournoi de Dressrosa. La flamme bleue «Hiken» est devenue symbole de fraternité." },
  { id:5,  name:'Pika Pika no Mi',            type:'Logia',    rarity:'legendaire', user:'Borsalino — Kizaru',         emoji:'☀️', power:95, colors:['#78350f','#451a03'], classified:false, spoiler:false,
    desc:"Transforme en lumière pure. Vitesse absolue — 300 000 km/s.", tags:['Vitesse Lumière','Amiral','Laser'],
    lore:"Kizaru se déplace à la vitesse de la lumière. L'un des obstacles les plus redoutables jamais affrontés par les Chapeaux de Paille à Sabaody." },
  { id:6,  name:'Suna Suna no Mi',            type:'Logia',    rarity:'legendaire', user:'Crocodile',                  emoji:'🏜️', power:86, colors:['#78350f','#451a03'], classified:false, spoiler:false,
    desc:"Maîtrise du sable sec. Déshydrate tout être vivant d'un simple contact.", tags:['Déshydratation','Shichibukai','Alabasta'],
    lore:"Ancien Warlord et chef de Baroque Works. A failli détruire le Royaume d'Alabasta. Vaincu deux fois par Luffy grâce au sang et à l'eau de mer." },
  { id:7,  name:'Ope Ope no Mi',              type:'Paramecia',rarity:'legendaire', user:'Trafalgar D. Law',           emoji:'🏥', power:94, colors:['#14532d','#052e16'], classified:false, spoiler:false,
    desc:"Crée une Salle d'Opération sphérique. Le fruit le plus précieux au monde.", tags:['Médecin','ROOM','Immortalité'],
    lore:"Peut conférer l'immortalité — au prix de la vie de l'utilisateur. Law l'a reçu de Corazón pour guérir la maladie de Flevance." },
  { id:8,  name:'Gura Gura no Mi',            type:'Paramecia',rarity:'legendaire', user:'Barbe Blanche → Barbe Noire',emoji:'🌊', power:99, colors:['#1e3a5f','#0f2040'], classified:false, spoiler:false,
    desc:"Crée des tremblements dans l'air et la mer. Peut détruire le monde.", tags:['Destruction','Yonko','Séisme'],
    lore:"Barbe Blanche causait des tsunamis géants. À sa mort, Barbe Noire a absorbé son pouvoir — possédant ainsi deux fruits simultanément." },
  { id:9,  name:'Ito Ito no Mi',              type:'Paramecia',rarity:'legendaire', user:'Donquixote Doflamingo',      emoji:'🕸️', power:88, colors:['#4a044e','#2d0030'], classified:false, spoiler:false,
    desc:"Génère des fils tranchant l'acier, contrôle les gens comme des marionnettes.", tags:['Marionnettiste','Shichibukai','Dressrosa'],
    lore:"Doflamingo a tissé sa toile sur Dressrosa pendant des décennies. Son Awaken couvre des îles entières de fils mortels." },
  { id:10, name:'Hana Hana no Mi',            type:'Paramecia',rarity:'rare',       user:'Nico Robin',                emoji:'🌸', power:78, colors:['#831843','#500724'], classified:false, spoiler:false,
    desc:"Fait éclore des copies de ses membres corporels sur n'importe quelle surface.", tags:['Archéologue','Ponéglyphes','Ohara'],
    lore:"Seule survivante d'Ohara. Robin peut faire apparaître ses membres partout à portée. Elle est la seule personne capable de lire les Ponéglyphes." },
  { id:11, name:'Bara Bara no Mi',            type:'Paramecia',rarity:'commun',     user:'Buggy le Clown',            emoji:'🤡', power:45, colors:['#7f1d1d','#450a0a'], classified:false, spoiler:false,
    desc:"Sépare le corps en morceaux indépendants flottants. Immunise contre les attaques tranchantes.", tags:['Comique','Buggy Pirates','Impel Down'],
    lore:"Fruit avalé accidentellement sur le vaisseau de Roger. Sa forme volante l'a paradoxalement sauvé d'innombrables situations absurdes." },
  { id:12, name:'Bari Bari no Mi',            type:'Paramecia',rarity:'rare',       user:'Bartolomeo',                emoji:'🛡️', power:72, colors:['#14532d','#052e16'], classified:false, spoiler:false,
    desc:"Crée des barrières indestructibles avec les doigts croisés.", tags:['Défense','Supernovae','Dressrosa'],
    lore:"Bartolomeo «le Cannibale» peut créer des barrières arrêtant des géants et des Logia puissants." },
  { id:13, name:'Zo Zo no Mi — Mammouth',     type:'Zoan',     rarity:'epique',     user:'Jack «la Sécheresse»',      emoji:'🦣', power:85, colors:['#7c2d12','#431407'], classified:false, spoiler:false,
    desc:"Transformation en mammouth antédiluvien. Force brute inégalée, régénération rapide.", tags:['Ancien Zoan','Beast Pirates','Force'],
    lore:"Jack est l'un des trois All-Stars des Pirates aux Cents Bêtes. Il a tenu seul contre deux amiraux de la Marine pendant des heures." },
  { id:14, name:'Ryu Ryu no Mi — Ptéranodon', type:'Zoan',     rarity:'epique',     user:"King «l'Ambition»",         emoji:'🦕', power:90, colors:['#292524','#1c1917'], classified:false, spoiler:false,
    desc:"Transformation en ptérosaure antique de feu. Puissance et vol supersonique.", tags:['Ancien Zoan','All-Star','Lunaria'],
    lore:"King est un Lunarian — race quasi-éteinte. Corps naturellement en feu + transformation préhistorique = l'un des guerriers les plus résistants." },
  { id:15, name:'Inu Inu no Mi — Kyūbi',      type:'Zoan',     rarity:'mythique',   user:'Catarina Devon',            emoji:'🦊', power:88, colors:['#7c2d12','#431407'], classified:false, spoiler:false,
    desc:"Renard à neuf queues légendaire. Copie parfaite de toute apparence.", tags:['Mythique','Barbe Noire','Espion'],
    lore:"Devon, capitaine parmi les Dix Titres de Barbe Noire, peut imiter parfaitement n'importe qui — le maître espion absolu de la flotte." },
  { id:16, name:'Hito Hito no Mi — Nika',     type:'Zoan',     rarity:'mythique',   user:'Monkey D. Luffy',           emoji:'☀️', power:100,colors:['#7f1d1d','#450a0a'], classified:false, spoiler:true,
    desc:"Le fruit le plus puissant de l'histoire. Le Dieu du Soleil Nika. Éveil : Gear 5.", tags:['Gear 5','Dieu du Soleil','Joyboy'],
    lore:"Classifié sous le nom «Gomu Gomu no Mi» pendant des siècles. À l'Éveil, Luffy incarne Nika et transforme la réalité elle-même comme du caoutchouc." },
  { id:17, name:'Tori Tori no Mi — Phénix',   type:'Zoan',     rarity:'mythique',   user:'Marco',                     emoji:'🦅', power:91, colors:['#1e3a5f','#0f2040'], classified:false, spoiler:false,
    desc:"Transformation en phénix légendaire. Régénération infinie par flammes bleues.", tags:['Phénix','Barbe Blanche','Flotte'],
    lore:"Marco peut régénérer indéfiniment grâce aux flammes bleues de son phénix, qui guérissent aussi les alliés proches." },
  { id:18, name:'Hebi Hebi no Mi — Orochi',   type:'Zoan',     rarity:'mythique',   user:'Kurozumi Orochi',           emoji:'🐉', power:79, colors:['#14532d','#052e16'], classified:false, spoiler:false,
    desc:"Dragon à huit têtes de la mythologie japonaise. Chaque tête, une conscience distincte.", tags:['Mythique','Wano','Shogun'],
    lore:"L'ancien Shogun de Wano se transforme en hydre à huit têtes. Il régénère chaque tête individuellement — quasi-immortel tant qu'une subsiste." },
  { id:19, name:'Uo Uo no Mi — Seiryū',       type:'Zoan',     rarity:'mythique',   user:'Kaidou des Cents Bêtes',    emoji:'🐲', power:98, colors:['#1e3a5f','#0f2040'], classified:false, spoiler:false,
    desc:"Dragon céleste azure légendaire. L'être vivant le plus fort du monde.", tags:['Dragon','Yonko','Onigashima'],
    lore:"Kaido a survécu à toutes les exécutions. Son dragon crache des flammes et déclenche des tornades. Son seul vrai rival : Luffy en Gear 5." },
  { id:20, name:'???', type:'???', rarity:'classifie', user:'Im-sama',  emoji:'👁️', power:0, colors:['#450a0a','#0d0007'], classified:true, spoiler:false,
    desc:"Dossier inaccessible — Niveau d'autorisation 5 requis.", tags:['CLASSIFIÉ','Gouvernement Mondial','Im-sama'], lore:"Classifié." },
  { id:21, name:'???', type:'???', rarity:'classifie', user:'Inconnu', emoji:'⚠️', power:0, colors:['#450a0a','#0d0007'], classified:true, spoiler:false,
    desc:"Fruit détecté par le réseau de renseignement. Nature : CLASSIFIÉ.", tags:['CLASSIFIÉ','Niveau 5','Alerte Rouge'], lore:"Classifié." },
]

// ─── KEYFRAMES ────────────────────────────────────────────────────────────────
const KF = `
@keyframes df-ring   { 0%{width:44px;height:44px;opacity:.6} 100%{width:190px;height:190px;opacity:0} }
@keyframes df-scan   { 0%{top:-2px} 100%{top:102%} }
@keyframes df-shimmer{ 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes df-pulse  { 0%,100%{opacity:.5} 50%{opacity:1} }
@keyframes df-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
`

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function HoloOverlay() {
  return (
    <>
      <div style={{ position:'absolute',inset:0,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.015) 2px,rgba(255,255,255,0.015) 4px)',pointerEvents:'none',zIndex:3 }}/>
      <div style={{ position:'absolute',inset:0,background:'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.06) 50%,transparent 60%)',backgroundSize:'200% 100%',animation:'df-shimmer 3s linear infinite',pointerEvents:'none',zIndex:4 }}/>
    </>
  )
}
function ClassifiedOverlay() {
  return (
    <div style={{ position:'absolute',inset:0,background:'rgba(3,3,3,0.9)',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10 }}>
      <div style={{ position:'absolute',left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#9F1239,#E11D48,#9F1239,transparent)',animation:'df-scan 2.5s linear infinite',zIndex:11 }}/>
      <div style={{ fontSize:'2.2rem',filter:'drop-shadow(0 0 12px #9F1239)',animation:'df-pulse 2s ease-in-out infinite',zIndex:12 }}>🔒</div>
      <div style={{ fontFamily:'Rajdhani,sans-serif',fontSize:10,fontWeight:700,letterSpacing:'0.22em',color:'#9F1239',textTransform:'uppercase',zIndex:12 }}>CLASSIFIÉ — NIVEAU 5</div>
    </div>
  )
}

function FruitCard({ fruit, index, spoiler, onClick }) {
  const rm  = RM[fruit.rarity] || RM.commun
  const tm  = TM[fruit.type]   || { color:'#666666' }
  const blur = spoiler && fruit.spoiler
  return (
    <motion.div
      initial={{ opacity:0, y:28, scale:0.96 }}
      animate={{ opacity:1, y:0, scale:1 }}
      transition={{ duration:0.48, delay:index*0.055, ease:[0.23,1,0.32,1] }}
      onClick={onClick}
      whileHover={{ y:-6, scale:1.015 }}
      style={{ background:'#0A0A0A',border:`1px solid ${rm.color}`,borderRadius:8,overflow:'hidden',cursor:'pointer',position:'relative',minHeight:340,display:'flex',flexDirection:'column',boxShadow:'0 4px 24px rgba(0,0,0,0.4)',transition:'box-shadow 0.35s' }}
      onHoverStart={e=>{ e.currentTarget.style.boxShadow=`0 0 28px ${rm.glow},0 24px 60px rgba(0,0,0,0.6)` }}
      onHoverEnd={e  =>{ e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,0.4)' }}
    >
      <div style={{ position:'absolute',top:0,left:0,width:20,height:1,background:rm.color,opacity:0.7 }}/>
      <div style={{ position:'absolute',top:0,left:0,width:1,height:20,background:rm.color,opacity:0.7 }}/>
      <div style={{ position:'absolute',bottom:0,right:0,width:20,height:1,background:rm.color,opacity:0.3 }}/>
      <div style={{ position:'absolute',bottom:0,right:0,width:1,height:20,background:rm.color,opacity:0.3 }}/>
      <div style={{ position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(255,255,255,0.025) 0%,transparent 50%)',pointerEvents:'none',zIndex:1 }}/>
      {/* Orb */}
      <div style={{ position:'relative',height:162,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,background:`radial-gradient(ellipse at 50% 80%,${fruit.colors[0]}55 0%,${fruit.colors[1]}33 50%,transparent 100%)`,opacity:0.32 }}/>
        {[0,0.9,1.8].map((d,i)=>(
          <div key={i} style={{ position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',borderRadius:'50%',border:`1px solid ${rm.color}`,animation:`df-ring 2.5s ease-out ${d}s infinite`,pointerEvents:'none' }}/>
        ))}
        <div style={{ fontSize:'3.2rem',position:'relative',zIndex:2,filter:`drop-shadow(0 0 18px ${rm.color})` }}>{fruit.emoji}</div>
        <HoloOverlay />
        {fruit.classified && <ClassifiedOverlay />}
        <div style={{ position:'absolute',top:10,right:10,zIndex:12 }}>
          <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',padding:'2px 8px',borderRadius:2,border:`1px solid ${rm.color}`,color:rm.color,background:'rgba(0,0,0,0.65)' }}>{rm.label}</span>
        </div>
        {!fruit.classified && (
          <div style={{ position:'absolute',top:10,left:10,zIndex:12 }}>
            <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,letterSpacing:'0.15em',color:rm.color,opacity:0.7 }}>PWR </span>
            <span style={{ fontFamily:'Cinzel,serif',fontSize:14,fontWeight:700,color:rm.color }}>{fruit.power}</span>
          </div>
        )}
      </div>
      {/* Body */}
      <div style={{ padding:'14px 16px 18px',flex:1,display:'flex',flexDirection:'column',gap:8,background:`linear-gradient(180deg,${rm.bg} 0%,transparent 100%)` }}>
        <h3 style={{ fontFamily:'Cinzel,serif',fontSize:14,fontWeight:700,color:blur?'transparent':'#EBEBEB',textShadow:blur?'0 0 12px #EBEBEB':'none',letterSpacing:'0.03em',margin:0,lineHeight:1.3 }}>{fruit.name}</h3>
        <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
          {!fruit.classified && <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'2px 7px',borderRadius:2,background:`rgba(${hexRgb(tm.color)},0.1)`,color:tm.color,border:`1px solid ${tm.color}33` }}>{fruit.type}</span>}
          <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',padding:'2px 7px',borderRadius:2,background:'rgba(255,255,255,0.03)',color:'#555',border:'1px solid #1A1A1A',maxWidth:165,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',filter:blur?'blur(5px)':'none' }}>{fruit.user}</span>
        </div>
        <p style={{ fontFamily:'Inter,sans-serif',fontSize:12,color:'#555',lineHeight:1.6,margin:0,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',filter:blur?'blur(5px)':'none' }}>{fruit.desc}</p>
        <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginTop:'auto' }}>
          {fruit.tags.slice(0,3).map(t=><span key={t} style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#333',background:'#0D0D0D',border:'1px solid #1A1A1A',padding:'1px 6px',borderRadius:2 }}>{t}</span>)}
        </div>
        <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
          style={{ fontFamily:'Rajdhani,sans-serif',fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',padding:'8px 0',borderRadius:3,border:`1px solid ${rm.color}`,color:rm.color,background:'rgba(0,0,0,0.4)',cursor:'pointer',width:'100%',marginTop:6,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
          {fruit.classified
            ? <><Ico name="lock" size={11}/> ACCÈS REFUSÉ</>
            : <><Ico name="folder" size={11}/> OUVRIR LE DOSSIER</>}
        </motion.button>
      </div>
    </motion.div>
  )
}

function FruitModal({ fruit, spoiler, onClose }) {
  const rm  = RM[fruit.rarity] || RM.commun
  const tm  = TM[fruit.type]   || { color:'#666666' }
  const blur = spoiler && fruit.spoiler
  useEffect(()=>{ const fn=e=>e.key==='Escape'&&onClose(); window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn) },[onClose])
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}
      style={{ position:'fixed',inset:0,background:'rgba(3,3,3,0.93)',backdropFilter:'blur(12px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <motion.div initial={{ opacity:0,y:-20,scale:0.95 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:10,scale:0.97 }} transition={{ duration:0.4,ease:[0.23,1,0.32,1] }} onClick={e=>e.stopPropagation()}
        style={{ width:'100%',maxWidth:680,maxHeight:'90vh',overflowY:'auto',background:'#0F0F0F',border:`1px solid ${rm.color}44`,borderRadius:10,boxShadow:`0 0 60px ${rm.glow},0 0 120px rgba(0,0,0,0.8)` }}>
        {fruit.classified ? (
          <div style={{ padding:60,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:16 }}>
            <div style={{ fontSize:'4rem',filter:'drop-shadow(0 0 20px #9F1239)',animation:'df-pulse 2s infinite' }}>🔒</div>
            <h2 style={{ fontFamily:'Cinzel Decorative,serif',fontSize:22,color:'#9F1239',letterSpacing:'0.2em',margin:0 }}>ACCÈS CLASSIFIÉ</h2>
            <div style={{ width:'70%',height:1,background:'linear-gradient(90deg,transparent,#9F1239,transparent)' }}/>
            <p style={{ fontFamily:'Inter,sans-serif',fontSize:13,color:'#3D1520',maxWidth:400,lineHeight:1.7 }}>Ce dossier est scellé par ordre du Gouvernement Mondial. Toute tentative d'accès non autorisée sera considérée comme un acte de trahison envers le Vide du Trône.</p>
            <button onClick={onClose} style={{ fontFamily:'Rajdhani,sans-serif',fontSize:13,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',padding:'10px 36px',borderRadius:3,border:'1px solid #9F1239',color:'#9F1239',background:'rgba(0,0,0,0.4)',cursor:'pointer',marginTop:8 }}>FERMER</button>
          </div>
        ) : (
          <>
            <div style={{ position:'relative',height:220,overflow:'hidden',background:`radial-gradient(ellipse at 50% 80%,${fruit.colors[0]}66 0%,${fruit.colors[1]}44 50%,#030303 100%)` }}>
              <HoloOverlay />
              <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <div style={{ fontSize:'5.5rem',filter:`drop-shadow(0 0 40px ${rm.color}) drop-shadow(0 0 10px ${rm.color})`,animation:'df-float 6s ease-in-out infinite' }}>{fruit.emoji}</div>
              </div>
              {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i)=>(
                <div key={i} style={{ position:'absolute',[v]:0,[h]:0,width:60,height:60,borderTop:v==='top'?`1px solid ${rm.color}44`:'none',borderBottom:v==='bottom'?`1px solid ${rm.color}44`:'none',borderLeft:h==='left'?`1px solid ${rm.color}44`:'none',borderRight:h==='right'?`1px solid ${rm.color}44`:'none' }}/>
              ))}
              <div style={{ position:'absolute',top:14,right:14 }}>
                <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',padding:'4px 12px',borderRadius:2,border:`1px solid ${rm.color}`,color:rm.color,background:'rgba(0,0,0,0.7)' }}>{rm.label}</span>
              </div>
              <div style={{ position:'absolute',top:12,left:14 }}>
                <div style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,color:rm.color,letterSpacing:'0.2em',opacity:0.7 }}>PUISSANCE</div>
                <div style={{ fontFamily:'Cinzel,serif',fontSize:28,color:rm.color,lineHeight:1 }}>{fruit.power}</div>
              </div>
              <button onClick={onClose} style={{ position:'absolute',top:12,right:90,padding:'6px 10px',borderRadius:6,background:'rgba(0,0,0,0.5)',border:'1px solid #1A1A1A',color:'#555',cursor:'pointer',display:'flex',alignItems:'center' }}>
                <Ico name="x" size={14}/>
              </button>
            </div>
            <div style={{ height:1,background:`linear-gradient(90deg,transparent,${rm.color}66,transparent)` }}/>
            <div style={{ padding:'24px 28px 28px',display:'flex',flexDirection:'column',gap:20 }}>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16 }}>
                <div>
                  <h2 style={{ fontFamily:'Cinzel,serif',fontSize:22,fontWeight:900,color:'#F0F0F0',margin:'0 0 6px',filter:blur?'blur(10px)':'none' }}>{fruit.name}</h2>
                  <p style={{ fontFamily:'Rajdhani,sans-serif',fontSize:13,fontWeight:600,letterSpacing:'0.08em',color:'#555',margin:0,filter:blur?'blur(6px)':'none' }}>{fruit.user}</p>
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:5,alignItems:'flex-end',flexShrink:0 }}>
                  <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'3px 10px',borderRadius:2,background:`rgba(${hexRgb(tm.color)},0.1)`,color:tm.color,border:`1px solid ${tm.color}33` }}>{fruit.type}</span>
                  {fruit.spoiler && <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'2px 8px',borderRadius:2,background:'rgba(234,179,8,0.08)',color:'#EAB308',border:'1px solid rgba(234,179,8,0.2)' }}>SPOILER</span>}
                </div>
              </div>
              <div style={{ height:1,background:'#111' }}/>
              <div>
                <div style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.25em',color:'#2A2A2A',textTransform:'uppercase',marginBottom:8 }}>Description</div>
                <p style={{ fontFamily:'Inter,sans-serif',fontSize:13,color:'#777',lineHeight:1.7,margin:0,filter:blur?'blur(5px)':'none' }}>{fruit.desc}</p>
              </div>
              <div style={{ background:'rgba(255,255,255,0.015)',border:'1px solid #1A1A1A',borderLeft:`2px solid ${rm.color}`,padding:'16px 20px',borderRadius:4 }}>
                <div style={{ fontFamily:'Rajdhani,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.25em',color:'#2A2A2A',textTransform:'uppercase',marginBottom:8 }}>⚓ Lore</div>
                <p style={{ fontFamily:'Inter,sans-serif',fontSize:12,color:'#555',lineHeight:1.7,margin:0,filter:blur?'blur(5px)':'none' }}>{fruit.lore}</p>
              </div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {fruit.tags.map(t=><span key={t} style={{ fontFamily:'Rajdhani,sans-serif',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',padding:'3px 10px',borderRadius:2,color:rm.color,background:`rgba(${hexRgb(rm.color)},0.06)`,border:`1px solid rgba(${hexRgb(rm.color)},0.2)` }}>{t}</span>)}
              </div>
              <div style={{ display:'flex',gap:12,paddingTop:4 }}>
                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                  style={{ flex:1,fontFamily:'Rajdhani,sans-serif',fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',padding:'10px 0',borderRadius:3,border:`1px solid ${rm.color}`,color:rm.color,background:'rgba(0,0,0,0.4)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                  <Ico name="star" size={11}/> AJOUTER AUX FAVORIS
                </motion.button>
                <button onClick={onClose} style={{ fontFamily:'Rajdhani,sans-serif',fontSize:12,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'10px 20px',borderRadius:3,border:'1px solid #222',color:'#444',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
                  <Ico name="x" size={12}/>
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function FilterTab({ label, icon, value, active, color, glow, onClick }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale:0.95 }}
      style={{ fontFamily:'Rajdhani,sans-serif',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',padding:'6px 16px',borderRadius:4,border:`1px solid ${active?color:'#1A1A1A'}`,color:active?color:'#555',background:active?'rgba(0,0,0,0.5)':'transparent',cursor:'pointer',whiteSpace:'nowrap',boxShadow:active?`0 0 12px ${glow||color+'44'}`:'none',display:'flex',alignItems:'center',gap:6,transition:'all 0.2s' }}>
      {icon && <Ico name={icon} size={11}/>}{label}
    </motion.button>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DevilFruitPage() {
  const [filter,  setFilter]  = useState('tout')
  const [sort,    setSort]    = useState('rarity')
  const [view,    setView]    = useState('grid')
  const [spoiler, setSpoiler] = useState(false)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(null)

  useEffect(()=>{ const el=document.createElement('style'); el.textContent=KF; document.head.appendChild(el); return()=>document.head.removeChild(el) },[])

  const filtered = useMemo(()=>{
    let list=[...FRUITS]
    if(search){ const q=search.toLowerCase(); list=list.filter(f=>f.name.toLowerCase().includes(q)||f.user.toLowerCase().includes(q)||f.tags.some(t=>t.toLowerCase().includes(q))) }
    if(filter==='logia')      list=list.filter(f=>f.type==='Logia')
    if(filter==='paramecia')  list=list.filter(f=>f.type==='Paramecia')
    if(filter==='zoan')       list=list.filter(f=>f.type==='Zoan'&&f.rarity!=='mythique')
    if(filter==='mythique')   list=list.filter(f=>f.rarity==='mythique')
    if(filter==='legendaire') list=list.filter(f=>f.rarity==='legendaire')
    if(filter==='classifie')  list=list.filter(f=>f.classified)
    if(sort==='rarity') list.sort((a,b)=>(RM[a.rarity]?.order||9)-(RM[b.rarity]?.order||9))
    if(sort==='alpha')  list.sort((a,b)=>a.name.localeCompare(b.name))
    if(sort==='type')   list.sort((a,b)=>a.type.localeCompare(b.type))
    return list
  },[filter,sort,search])

  const FILTERS = [
    { value:'tout',       label:'Tout',       icon:'layers',   color:'#EAB308', glow:'rgba(234,179,8,0.3)'  },
    { value:'logia',      label:'Logia',       icon:'wind',     color:'#3B82F6', glow:'rgba(59,130,246,0.3)' },
    { value:'paramecia',  label:'Paramecia',   icon:'zap',      color:'#10B981', glow:'rgba(16,185,129,0.3)' },
    { value:'zoan',       label:'Zoan',        icon:'paw',      color:'#F97316', glow:'rgba(249,115,22,0.3)' },
    { value:'mythique',   label:'Mythique',    icon:'sparkles', color:'#A855F7', glow:'rgba(168,85,247,0.3)' },
    { value:'legendaire', label:'Légendaire',  icon:'crown',    color:'#EAB308', glow:'rgba(234,179,8,0.35)' },
    { value:'classifie',  label:'Classifié',   icon:'lock',     color:'#9F1239', glow:'rgba(159,18,57,0.4)'  },
  ]
  const cols = view==='compact' ? 'repeat(auto-fill,minmax(200px,1fr))' : view==='list' ? '1fr' : 'repeat(auto-fill,minmax(260px,1fr))'

  return (
    <div style={{ minHeight:'100vh',background:'#030303',position:'relative',fontFamily:'Inter,sans-serif' }}>
      {/* Poneglyph bg */}
      <div style={{ position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:0.04,backgroundImage:['repeating-linear-gradient(0deg,transparent,transparent 39px,#EAB308 39px,#EAB308 40px)','repeating-linear-gradient(90deg,transparent,transparent 39px,#EAB308 39px,#EAB308 40px)','repeating-linear-gradient(45deg,transparent,transparent 14px,#9F1239 14px,#9F1239 15px)','repeating-linear-gradient(-45deg,transparent,transparent 14px,#9F1239 14px,#9F1239 15px)'].join(','),backgroundSize:'40px 40px,40px 40px,15px 15px,15px 15px' }}/>
      <div style={{ position:'fixed',inset:0,zIndex:0,pointerEvents:'none',background:'radial-gradient(ellipse 100% 100% at 50% 100%,rgba(159,18,57,0.07) 0%,transparent 60%)' }}/>

      {/* Header */}
      <div style={{ position:'relative',zIndex:2,padding:'48px 48px 32px',textAlign:'center',borderBottom:'1px solid #111' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:16,marginBottom:12 }}>
          <div style={{ width:44,height:44,border:'1px solid rgba(159,18,57,0.4)',borderRadius:6,background:'rgba(159,18,57,0.08)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px rgba(159,18,57,0.2)' }}>
            <Ico name="anchor" size={20} color="#9F1239"/>
          </div>
          <div style={{ textAlign:'left' }}>
            <h1 style={{ fontFamily:'Cinzel Decorative,serif',fontSize:'clamp(16px,2.5vw,26px)',fontWeight:900,color:'#F0F0F0',letterSpacing:'0.2em',margin:0,lineHeight:1 }}>ONE PIECE</h1>
            <p style={{ fontFamily:'Rajdhani,sans-serif',fontSize:10,fontWeight:700,color:'#9F1239',letterSpacing:'0.35em',textTransform:'uppercase',margin:'4px 0 0' }}>ARCHIVES ÉTERNELLES — FRUITS DU DÉMON</p>
          </div>
        </div>
        <div style={{ height:1,maxWidth:600,margin:'16px auto 0',background:'linear-gradient(90deg,transparent,#9F1239 20%,#EAB308 50%,#9F1239 80%,transparent)',opacity:0.6 }}/>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:14,marginTop:16,flexWrap:'wrap' }}>
          {[{ label:'Fruits indexés',value:FRUITS.length,color:'#EAB308' },{ label:'Fruits classifiés',value:FRUITS.filter(f=>f.classified).length,color:'#9F1239' },{ label:'Mythiques',value:FRUITS.filter(f=>f.rarity==='mythique').length,color:'#A855F7' }].map(s=>(
            <div key={s.label} style={{ display:'flex',alignItems:'center',gap:8,fontFamily:'Rajdhani,sans-serif',fontSize:11,fontWeight:600,letterSpacing:'0.12em',color:'#333',textTransform:'uppercase',padding:'4px 14px',border:'1px solid #1A1A1A',borderRadius:3 }}>
              <span style={{ color:s.color,fontWeight:800 }}>{s.value}</span>{s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ position:'sticky',top:0,zIndex:100,background:'rgba(3,3,3,0.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid #111',padding:'12px 32px',display:'flex',flexDirection:'column',gap:10 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
          <div style={{ position:'relative' }}>
            <Ico name="search" size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#333' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un fruit..."
              style={{ background:'rgba(20,20,20,0.8)',border:'1px solid #1A1A1A',color:'#CCC',fontFamily:'Inter,sans-serif',fontSize:12,padding:'7px 14px 7px 36px',borderRadius:4,outline:'none',width:260,transition:'border-color 0.2s' }}
              onFocus={e=>e.target.style.borderColor='#333'} onBlur={e=>e.target.style.borderColor='#1A1A1A'}/>
          </div>
          <div style={{ flex:1 }}/>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <Ico name="sort" size={12} color="#333"/>
            <select value={sort} onChange={e=>setSort(e.target.value)} style={{ background:'#0F0F0F',border:'1px solid #1A1A1A',color:'#777',fontFamily:'Rajdhani,sans-serif',fontSize:12,fontWeight:600,letterSpacing:'0.06em',padding:'6px 28px 6px 10px',borderRadius:4,outline:'none',cursor:'pointer',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23555'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center' }}>
              <option value="rarity">Rareté</option>
              <option value="alpha">Alphabétique</option>
              <option value="type">Type</option>
            </select>
          </div>
          <div style={{ display:'flex',border:'1px solid #1A1A1A',borderRadius:4,overflow:'hidden' }}>
            {[{v:'grid',i:'grid'},{v:'list',i:'list'},{v:'compact',i:'compact'}].map(({v,i})=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:'7px 10px',background:view===v?'rgba(234,179,8,0.08)':'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',color:view===v?'#EAB308':'#444',transition:'all 0.2s' }}>
                <Ico name={i} size={15}/>
              </button>
            ))}
          </div>
          <button onClick={()=>setSpoiler(s=>!s)} style={{ display:'flex',alignItems:'center',gap:8,fontFamily:'Rajdhani,sans-serif',fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',padding:'6px 14px',borderRadius:4,border:`1px solid ${spoiler?'rgba(234,179,8,0.35)':'#1A1A1A'}`,color:spoiler?'#EAB308':'#555',background:'transparent',cursor:'pointer',transition:'all 0.25s' }}>
            <Ico name={spoiler?'eyeoff':'eye'} size={12}/>
            Spoilers
            <div style={{ width:30,height:16,borderRadius:8,position:'relative',background:spoiler?'rgba(234,179,8,0.2)':'#1A1A1A',border:spoiler?'1px solid #EAB308':'1px solid transparent',transition:'all 0.25s' }}>
              <div style={{ position:'absolute',top:2,left:spoiler?13:2,width:10,height:10,borderRadius:'50%',background:spoiler?'#EAB308':'#444',boxShadow:spoiler?'0 0 6px #EAB308':'none',transition:'all 0.25s' }}/>
            </div>
          </button>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
          {FILTERS.map(f=><FilterTab key={f.value} {...f} active={filter===f.value} onClick={()=>setFilter(f.value)}/>)}
          <div style={{ flex:1 }}/>
          <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:10,fontWeight:700,letterSpacing:'0.2em',color:'#2A2A2A',textTransform:'uppercase' }}>{filtered.length} RÉSULTATS</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ position:'relative',zIndex:2,padding:'32px 32px 80px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:28 }}>
          <div style={{ flex:1,height:1,background:'#111' }}/>
          <span style={{ fontFamily:'Rajdhani,sans-serif',fontSize:10,fontWeight:700,letterSpacing:'0.25em',color:'#2A2A2A',textTransform:'uppercase',whiteSpace:'nowrap' }}>Fruits du Démon · One Piece</span>
          <div style={{ flex:1,height:1,background:'#111' }}/>
        </div>
        {filtered.length===0 ? (
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 0',gap:16 }}>
            <span style={{ fontSize:'3rem',opacity:0.2 }}>🍎</span>
            <p style={{ fontFamily:'Cinzel,serif',fontSize:16,color:'#222',margin:0 }}>Aucun fruit trouvé</p>
          </div>
        ) : (
          <div style={{ display:'grid',gridTemplateColumns:cols,gap:20 }}>
            <AnimatePresence mode="popLayout">
              {filtered.map((fruit,i)=><FruitCard key={fruit.id} fruit={fruit} index={i} spoiler={spoiler} onClick={()=>setModal(fruit)}/>)}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && <FruitModal fruit={modal} spoiler={spoiler} onClose={()=>setModal(null)}/>}
      </AnimatePresence>
    </div>
  )
}
