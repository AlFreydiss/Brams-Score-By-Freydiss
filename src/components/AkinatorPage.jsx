import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// ── Design tokens (palette Tournoi) ───────────────────────────────────────
const BG     = '#07090e'
const PINK   = '#9d174d'
const PURPLE = '#4c1d95'
const PINK_L = '#f9a8d4'
const PINK_M = '#db2777'
const GRAD   = `linear-gradient(135deg, ${PINK} 0%, ${PURPLE} 100%)`
const GLASS  = 'rgba(16,10,30,0.82)'
const TEXT   = '#f0e8f8'
const MUTED  = 'rgba(240,232,248,0.45)'

// ── Characters database ────────────────────────────────────────────────────
// m=homme | pir=pirate | mar=marine | rev=révolutionnaire
// df=devil fruit | par=paramecia | log=logia | zo=zoan
// hak=haki | cq=haki des rois | sh=chapeau de paille
// yk=yonko | wl=corsaire | adm=amiral | sw=épéiste
// bl=blond | bh=cheveux noirs | rh=rouge/rose
// al=vivant | bb=prime>1B | cap=capitaine | old=âgé | gnt=très grand | cyb=cyborg
const CHARS = [
  { id:'luffy',      name:'Monkey D. Luffy',      emoji:'🏴‍☠️', color:'#e0524a',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:1,yk:1,wl:0,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'zoro',       name:'Roronoa Zoro',          emoji:'⚔️',  color:'#22c55e',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:1,sh:1,yk:0,wl:0,adm:0,sw:1,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'nami',       name:'Nami',                  emoji:'🍊',  color:'#f97316',
    attrs:{m:0,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:0,cq:0,sh:1,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:1,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'usopp',      name:'Usopp',                 emoji:'🎯',  color:'#a78a5f',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:0,cq:0,sh:1,yk:0,wl:0,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'sanji',      name:'Sanji',                 emoji:'🦵',  color:'#3b82f6',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:1,yk:0,wl:0,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'chopper',    name:'Tony Tony Chopper',     emoji:'🦌',  color:'#ec4899',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:0,log:0,zo:1,hak:0,cq:0,sh:1,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'robin',      name:'Nico Robin',            emoji:'📖',  color:'#8b5cf6',
    attrs:{m:0,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:0,cq:0,sh:1,yk:0,wl:0,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'franky',     name:'Franky',                emoji:'🤖',  color:'#06b6d4',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:0,cq:0,sh:1,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:1}},
  { id:'brook',      name:'Brook',                 emoji:'💀',  color:'#a3a3a3',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:0,cq:0,sh:1,yk:0,wl:0,adm:0,sw:1,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:1,gnt:0,cyb:0}},
  { id:'jinbe',      name:'Jinbe',                 emoji:'🐡',  color:'#60a5fa',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:1,yk:0,wl:1,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'ace',        name:'Portgas D. Ace',        emoji:'🔥',  color:'#f97316',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:1,rh:0,al:0,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'sabo',       name:'Sabo',                  emoji:'🎩',  color:'#eab308',
    attrs:{m:1,pir:0,mar:0,rev:1,df:1,par:0,log:1,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'shanks',     name:'Shanks',                emoji:'🌊',  color:'#ef4444',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:1,sh:0,yk:1,wl:0,adm:0,sw:1,bl:0,bh:0,rh:1,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'blackbeard', name:'Marshall D. Teach',     emoji:'☠️',  color:'#6366f1',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:1,zo:0,hak:1,cq:1,sh:0,yk:1,wl:1,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'whitebeard', name:'Edward Newgate',        emoji:'⚡',  color:'#e2e8f0',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:0,yk:1,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:0,bb:1,cap:1,old:1,gnt:1,cyb:0}},
  { id:'kaido',      name:'Kaido',                 emoji:'🐉',  color:'#7c3aed',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:0,log:0,zo:1,hak:1,cq:1,sh:0,yk:1,wl:0,adm:0,sw:1,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:1,cyb:0}},
  { id:'bigmom',     name:'Charlotte Linlin',      emoji:'🍰',  color:'#ec4899',
    attrs:{m:0,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:0,yk:1,wl:0,adm:0,sw:0,bl:0,bh:0,rh:1,al:1,bb:1,cap:1,old:1,gnt:1,cyb:0}},
  { id:'roger',      name:'Gol D. Roger',          emoji:'👑',  color:'#f59e0b',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:1,bl:0,bh:1,rh:0,al:0,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'law',        name:'Trafalgar Law',         emoji:'💙',  color:'#3b82f6',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:1,adm:0,sw:1,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'kid',        name:'Eustass Kid',           emoji:'🦾',  color:'#ef4444',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:1,al:1,bb:1,cap:1,old:0,gnt:0,cyb:1}},
  { id:'katakuri',   name:'Charlotte Katakuri',    emoji:'🍡',  color:'#f97316',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:1,al:1,bb:1,cap:0,old:0,gnt:1,cyb:0}},
  { id:'yamato',     name:'Yamato',                emoji:'❄️',  color:'#93c5fd',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:0,log:0,zo:1,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:1,bl:1,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'crocodile',  name:'Crocodile',             emoji:'🐊',  color:'#d97706',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:0,log:1,zo:0,hak:0,cq:0,sh:0,yk:0,wl:1,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'doflamingo', name:'Donquixote Doflamingo', emoji:'🦩',  color:'#ec4899',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:1,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'mihawk',     name:'Dracule Mihawk',        emoji:'🦅',  color:'#fbbf24',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:1,adm:0,sw:1,bl:0,bh:1,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'hancock',    name:'Boa Hancock',           emoji:'🐍',  color:'#ec4899',
    attrs:{m:0,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:1,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'moriah',     name:'Gecko Moriah',          emoji:'🕷️',  color:'#a78bfa',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:0,cq:0,sh:0,yk:0,wl:1,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:1,cap:1,old:0,gnt:1,cyb:0}},
  { id:'kuma',       name:'Bartholomew Kuma',      emoji:'🐻',  color:'#6b7280',
    attrs:{m:1,pir:0,mar:0,rev:1,df:1,par:1,log:0,zo:0,hak:0,cq:0,sh:0,yk:0,wl:1,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:0,cap:0,old:0,gnt:1,cyb:1}},
  { id:'buggy',      name:'Buggy le Clown',        emoji:'🤡',  color:'#ef4444',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:0,cq:0,sh:0,yk:1,wl:1,adm:0,sw:0,bl:0,bh:0,rh:1,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'garp',       name:'Monkey D. Garp',        emoji:'👊',  color:'#94a3b8',
    attrs:{m:1,pir:0,mar:1,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:1,gnt:0,cyb:0}},
  { id:'sengoku',    name:'Sengoku',               emoji:'🔔',  color:'#a78a5f',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:0,log:0,zo:1,hak:1,cq:1,sh:0,yk:0,wl:0,adm:1,sw:0,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:1,gnt:0,cyb:0}},
  { id:'akainu',     name:'Sakazuki (Akainu)',     emoji:'🌋',  color:'#dc2626',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:1,sw:0,bl:0,bh:1,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'aokiji',     name:'Kuzan (Aokiji)',        emoji:'🧊',  color:'#93c5fd',
    attrs:{m:1,pir:0,mar:0,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:1,sw:0,bl:0,bh:1,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'kizaru',     name:'Borsalino (Kizaru)',    emoji:'💡',  color:'#fbbf24',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:1,sw:0,bl:1,bh:0,rh:0,al:1,bb:0,cap:0,old:1,gnt:0,cyb:0}},
  { id:'fujitora',   name:'Issho (Fujitora)',      emoji:'🌀',  color:'#8b5cf6',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:1,sw:1,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:1,gnt:0,cyb:0}},
  { id:'smoker',     name:'Smoker',                emoji:'💨',  color:'#e2e8f0',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'tashigi',    name:'Tashigi',               emoji:'🗡️',  color:'#34d399',
    attrs:{m:0,pir:0,mar:1,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:1,bl:0,bh:1,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'coby',       name:'Coby',                  emoji:'🎖️',  color:'#f9a8d4',
    attrs:{m:1,pir:0,mar:1,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:1,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'dragon',     name:'Monkey D. Dragon',      emoji:'🌪️',  color:'#22c55e',
    attrs:{m:1,pir:0,mar:0,rev:1,df:1,par:0,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'ivankov',    name:'Emporio Ivankov',       emoji:'💉',  color:'#a855f7',
    attrs:{m:1,pir:0,mar:0,rev:1,df:1,par:1,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'enel',       name:'Enel',                  emoji:'⛈️',  color:'#fbbf24',
    attrs:{m:1,pir:0,mar:0,rev:0,df:1,par:0,log:1,zo:0,hak:0,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:0,cap:1,old:0,gnt:0,cyb:0}},
  { id:'rayleigh',   name:'Silvers Rayleigh',      emoji:'⚓',  color:'#94a3b8',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:1,gnt:0,cyb:0}},
  { id:'marco',      name:'Marco',                 emoji:'🦚',  color:'#3b82f6',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:0,log:0,zo:1,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'vivi',       name:'Nefertari Vivi',        emoji:'🌸',  color:'#60a5fa',
    attrs:{m:0,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:0,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'perona',     name:'Perona',                emoji:'👻',  color:'#f9a8d4',
    attrs:{m:0,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:0,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:1,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'carrot',     name:'Carrot',                emoji:'🐰',  color:'#fde68a',
    attrs:{m:0,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:0,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'killer',     name:'Killer',                emoji:'🗡️',  color:'#fbbf24',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:1,bl:1,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'garp',       name:'Monkey D. Garp',        emoji:'👊',  color:'#94a3b8',
    attrs:{m:1,pir:0,mar:1,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:1,gnt:1,cyb:0}},
  { id:'dragon',     name:'Monkey D. Dragon',      emoji:'🐲',  color:'#22c55e',
    attrs:{m:1,pir:0,mar:0,rev:1,df:0,par:0,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'hancock',    name:'Boa Hancock',            emoji:'🐍',  color:'#ec4899',
    attrs:{m:0,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:1,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'doflamingo', name:'Donquixote Doflamingo',  emoji:'🦩',  color:'#f472b6',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:1,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'mihawk',     name:'Dracule Mihawk',         emoji:'🦅',  color:'#fbbf24',
    attrs:{m:1,pir:0,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:1,adm:0,sw:1,bl:0,bh:1,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'crocodile',  name:'Crocodile',              emoji:'🐊',  color:'#78716c',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:0,log:1,zo:0,hak:0,cq:0,sh:0,yk:0,wl:1,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'kizaru',     name:'Borsalino (Kizaru)',     emoji:'⚡',  color:'#fef08a',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:1,sw:0,bl:0,bh:1,rh:0,al:1,bb:0,cap:0,old:1,gnt:0,cyb:0}},
  { id:'aokiji',     name:'Kuzan (Aokiji)',          emoji:'🧊',  color:'#93c5fd',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:1,sw:0,bl:0,bh:1,rh:0,al:1,bb:0,cap:0,old:0,gnt:1,cyb:0}},
  { id:'akainu',     name:'Sakazuki (Akainu)',       emoji:'🌋',  color:'#ef4444',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:1,sw:0,bl:0,bh:1,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'katakuri',   name:'Charlotte Katakuri',     emoji:'🍩',  color:'#a78bfa',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:1,cyb:0}},
  { id:'yamato',     name:'Yamato',                 emoji:'🐺',  color:'#60a5fa',
    attrs:{m:0,pir:1,mar:0,rev:0,df:1,par:0,log:0,zo:1,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:1,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:0,gnt:1,cyb:0}},
  { id:'rayleigh',   name:'Silvers Rayleigh',       emoji:'⚓',  color:'#d4a017',
    attrs:{m:1,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:1,sh:0,yk:0,wl:0,adm:0,sw:1,bl:0,bh:0,rh:0,al:1,bb:1,cap:0,old:1,gnt:0,cyb:0}},
  { id:'vivi',       name:'Nefertari Vivi',         emoji:'🦆',  color:'#38bdf8',
    attrs:{m:0,pir:1,mar:0,rev:0,df:0,par:0,log:0,zo:0,hak:0,cq:0,sh:1,yk:0,wl:0,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'coby',       name:'Coby',                  emoji:'🔵',  color:'#7dd3fc',
    attrs:{m:1,pir:0,mar:1,rev:0,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:1,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'smoker',     name:'Smoker',                emoji:'💨',  color:'#e2e8f0',
    attrs:{m:1,pir:0,mar:1,rev:0,df:1,par:0,log:1,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
  { id:'buggy',      name:'Buggy',                 emoji:'🤡',  color:'#ef4444',
    attrs:{m:1,pir:1,mar:0,rev:0,df:1,par:1,log:0,zo:0,hak:0,cq:0,sh:0,yk:1,wl:1,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:1,cap:1,old:0,gnt:0,cyb:0}},
  { id:'lucci',      name:'Rob Lucci',              emoji:'🐆',  color:'#1e293b',
    attrs:{m:1,pir:0,mar:0,rev:0,df:1,par:0,log:0,zo:1,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:1,rh:0,al:1,bb:1,cap:0,old:0,gnt:0,cyb:0}},
  { id:'ivankov',    name:'Emporio Ivankov',        emoji:'🦋',  color:'#d946ef',
    attrs:{m:1,pir:0,mar:0,rev:1,df:1,par:1,log:0,zo:0,hak:0,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:0,bh:0,rh:0,al:1,bb:0,cap:0,old:0,gnt:1,cyb:0}},
  { id:'koala',      name:'Koala',                  emoji:'🐨',  color:'#86efac',
    attrs:{m:0,pir:0,mar:0,rev:1,df:0,par:0,log:0,zo:0,hak:1,cq:0,sh:0,yk:0,wl:0,adm:0,sw:0,bl:1,bh:0,rh:0,al:1,bb:0,cap:0,old:0,gnt:0,cyb:0}},
]

// ── Questions ─────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id:'m',   text:'Votre personnage est-il un homme ?' },
  { id:'sh',  text:'Votre personnage est-il un Chapeau de Paille ?' },
  { id:'pir', text:'Votre personnage est-il un pirate ?' },
  { id:'mar', text:'Votre personnage est-il (ou a-t-il été) un Marine ?' },
  { id:'rev', text:'Votre personnage fait-il partie des Révolutionnaires ?' },
  { id:'df',  text:'Votre personnage possède-t-il un Fruit du Démon ?' },
  { id:'log', text:'Son Fruit du Démon est-il un Logia ?' },
  { id:'zo',  text:'Son Fruit du Démon est-il un Zoan ?' },
  { id:'hak', text:'Votre personnage maîtrise-t-il le Haki ?' },
  { id:'cq',  text:'Votre personnage possède-t-il le Haki des Rois ?' },
  { id:'yk',  text:'Votre personnage est-il (ou a-t-il été) un Yonko ?' },
  { id:'wl',  text:'Votre personnage est-il (ou a-t-il été) un Corsaire ?' },
  { id:'adm', text:'Votre personnage est-il (ou a-t-il été) un Amiral ?' },
  { id:'sw',  text:'Votre personnage se bat-il principalement à l\'épée ?' },
  { id:'bl',  text:'Votre personnage est-il blond ?' },
  { id:'bh',  text:'Votre personnage a-t-il les cheveux noirs ?' },
  { id:'rh',  text:'Votre personnage a-t-il les cheveux rouges ou roses ?' },
  { id:'al',  text:'Votre personnage est-il toujours en vie ?' },
  { id:'bb',  text:'Votre personnage a-t-il une prime de plus d\'1 milliard de Berrys ?' },
  { id:'cap', text:'Votre personnage est-il (ou a-t-il été) capitaine d\'un équipage ?' },
  { id:'old', text:'Votre personnage est-il âgé / vieux ?' },
  { id:'gnt', text:'Votre personnage est-il particulièrement grand ou imposant ?' },
  { id:'cyb', text:'Votre personnage a-t-il des modifications cybernétiques ou mécaniques ?' },
]

// ── Algorithm: entropie pour choisir la meilleure question ─────────────────
function entropy(remaining, qid) {
  const yes = remaining.filter(c => c.attrs[qid] === 1).length
  const total = remaining.length
  if (total === 0 || yes === 0 || yes === total) return 0
  const p = yes / total
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))
}

function pickQuestion(remaining, asked) {
  let best = null, bestScore = -1
  for (const q of QUESTIONS) {
    if (asked.has(q.id)) continue
    const yes = remaining.filter(c => c.attrs[q.id] === 1).length
    const no  = remaining.filter(c => c.attrs[q.id] === 0).length
    if (yes === 0 || no === 0) continue
    const score = entropy(remaining, q.id)
    if (score > bestScore) { bestScore = score; best = q }
  }
  return best || QUESTIONS.find(q => !asked.has(q.id)) || null
}

function filterChars(remaining, qid, answer) {
  if (answer === 'yes') return remaining.filter(c => c.attrs[qid] === 1)
  if (answer === 'no')  return remaining.filter(c => c.attrs[qid] === 0)
  return remaining
}

// ── Answer buttons ─────────────────────────────────────────────────────────
const ANSWERS = [
  { key:'yes',   label:'✅  OUI',         color:'#4ade80', bg:'rgba(34,197,94,.12)',   border:'rgba(34,197,94,.4)'   },
  { key:'no',    label:'❌  NON',          color:'#f87171', bg:'rgba(239,68,68,.12)',   border:'rgba(239,68,68,.4)'   },
  { key:'maybe', label:'🤔  PEUT-ÊTRE',   color:'#fbbf24', bg:'rgba(245,158,11,.12)',  border:'rgba(245,158,11,.4)'  },
  { key:'dunno', label:"❓  JE SAIS PAS", color:'#94a3b8', bg:'rgba(148,163,184,.08)', border:'rgba(148,163,184,.25)' },
]

// ── Sub-components ─────────────────────────────────────────────────────────

// ── Mascotte Freydiss ─────────────────────────────────────────────────────────
function FreydissMascot({ size = 100, pulse = true, mood = 'idle' }) {
  const eyeL = mood === 'thinking' ? 'M31 36 Q34 33 37 36' : null
  const eyeR = mood === 'thinking' ? 'M43 36 Q46 33 49 36' : null
  const moodEmoji = mood === 'found' ? '😏' : mood === 'lost' ? '😤' : null
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', position: 'relative',
        background: `linear-gradient(135deg, #9d174d 0%, #4c1d95 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: pulse ? 'akPulse 2.8s ease-in-out infinite' : 'none',
        boxShadow: `0 0 ${size*.35}px rgba(157,23,77,.55), 0 0 ${size*.7}px rgba(76,29,149,.28), inset 0 1px 0 rgba(255,255,255,.15)`,
      }}>
        {moodEmoji ? (
          <span style={{ fontSize: size * 0.55, lineHeight:1 }}>{moodEmoji}</span>
        ) : (
          <svg width={size*.8} height={size*.8} viewBox="0 0 80 80" style={{ overflow:'visible' }}>
            {/* Cheveux longs noirs bouclés — afro style (inspiré Freydiss) */}
            {/* Masse principale afro */}
            <ellipse cx="40" cy="20" rx="25" ry="18" fill="#0d0805" />
            {/* Boucles sur le dessus */}
            <circle cx="22" cy="17" r="9" fill="#120a06" />
            <circle cx="30" cy="10" r="10" fill="#0d0805" />
            <circle cx="40" cy="8"  r="11" fill="#110a06" />
            <circle cx="50" cy="10" r="10" fill="#0d0805" />
            <circle cx="58" cy="17" r="9"  fill="#120a06" />
            {/* Mèches longues qui tombent — style bouclé */}
            <path d="M18 28 Q10 44 14 60 Q16 66 13 72" stroke="#0d0805" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M62 28 Q70 44 66 60 Q64 66 67 72" stroke="#0d0805" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M14 34 Q6  50 10 64" stroke="#150b07" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M66 34 Q74 50 70 64" stroke="#150b07" strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Bandana pirate rouge sur le front */}
            <rect x="16" y="26" width="48" height="8" rx="3" fill="#9d174d" />
            <ellipse cx="40" cy="26" rx="5" ry="3" fill="#7b0f3a" />
            {/* Skull tiny sur le bandana */}
            <ellipse cx="40" cy="27" rx="3.5" ry="3" fill="white" opacity=".9" />
            <circle cx="38.5" cy="26.5" r=".9" fill="#0f0f1a" />
            <circle cx="41.5" cy="26.5" r=".9" fill="#0f0f1a" />
            <rect x="38" y="28.5" width="4" height="1" rx=".5" fill="#0f0f1a" />
            {/* Visage — teinte medium (inspiré Freydiss) */}
            <ellipse cx="40" cy="38" rx="17" ry="19" fill="#c8864a" />
            {/* Yeux */}
            {eyeL ? (
              <>
                <path d={eyeL} stroke="#4c1d95" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d={eyeR} stroke="#4c1d95" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <ellipse cx="33.5" cy="36.5" rx="3.8" ry="3.8" fill="white" />
                <ellipse cx="46.5" cy="36.5" rx="3.8" ry="3.8" fill="white" />
                <circle cx="34.5" cy="37.2" r="2.2" fill="#4c1d95" />
                <circle cx="47.5" cy="37.2" r="2.2" fill="#4c1d95" />
                <circle cx="35.2" cy="36.5" r=".9" fill="white" />
                <circle cx="48.2" cy="36.5" r=".9" fill="white" />
              </>
            )}
            {/* Joues */}
            <ellipse cx="27" cy="41.5" rx="5" ry="3" fill="rgba(255,120,120,.28)" />
            <ellipse cx="53" cy="41.5" rx="5" ry="3" fill="rgba(255,120,120,.28)" />
            {/* Sourire */}
            <path d="M32 46 Q40 52 48 46" stroke="#c07070" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {/* Étincelles */}
            <text x="61" y="22" fontSize="9" fill="#f59e0b" opacity=".85">✦</text>
            <text x="10" y="28" fontSize="7" fill="#f9a8d4" opacity=".75">✦</text>
            <text x="64" y="42" fontSize="6" fill="#f9a8d4" opacity=".6">✧</text>
          </svg>
        )}
      </div>
      <div style={{
        fontSize: size * 0.115, fontWeight:800, letterSpacing:'.08em',
        color:'rgba(249,168,212,.7)', textTransform:'uppercase',
        fontFamily:'var(--display)',
      }}>Freydiss</div>
    </div>
  )
}

function IdleScreen({ onStart }) {
  return (
    <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}
      style={{ textAlign:'center', maxWidth:580, padding:'0 16px' }}>
      <div style={{ marginBottom:36, animation:'akFloat 3.5s ease-in-out infinite' }}>
        <FreydissMascot size={130} />
      </div>

      <h1 style={{
        fontFamily:'var(--display)', fontSize:'clamp(28px,5vw,44px)', fontWeight:900,
        background:`linear-gradient(135deg, ${PINK_L} 0%, ${PINK_M} 50%, #a78bfa 100%)`,
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        marginBottom:14, lineHeight:1.15,
      }}>Je vais deviner votre personnage !</h1>

      <p style={{ fontSize:16, color:MUTED, lineHeight:1.7, marginBottom:36 }}>
        Pensez à un personnage de <strong style={{ color:PINK_L }}>One Piece</strong>.<br/>
        Répondez honnêtement à mes questions — je trouverai qui c'est<br/>
        en moins de <strong style={{ color:PINK_L }}>20 coups</strong>.
      </p>

      <button onClick={onStart} style={{
        padding:'16px 52px', borderRadius:100,
        background: GRAD, border:'none', cursor:'pointer',
        fontSize:18, fontWeight:800, color:'#fff',
        boxShadow:`0 8px 32px rgba(157,23,77,.45)`,
        transition:'all .2s', fontFamily:'var(--body)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow=`0 14px 44px rgba(157,23,77,.65)` }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow=`0 8px 32px rgba(157,23,77,.45)` }}
      >✨ Je suis prêt !</button>

      <p style={{ fontSize:12, color:'rgba(240,232,248,.25)', marginTop:20 }}>
        {CHARS.length} personnages · {QUESTIONS.length} questions disponibles
      </p>
    </motion.div>
  )
}

function AskingScreen({ question, qCount, remaining, total, onAnswer }) {
  const pct = Math.max(4, Math.round((1 - remaining / total) * 100))
  return (
    <motion.div initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
      transition={{ duration:.25 }}
      style={{ width:'100%', maxWidth:620, padding:'0 16px' }}>

      {/* Progress bar */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:12, fontWeight:700, color:MUTED, letterSpacing:'.08em', textTransform:'uppercase' }}>
            Question {qCount + 1}
          </span>
          <span style={{ fontSize:12, fontWeight:700, color:PINK_L }}>
            {remaining} suspect{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ height:5, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:GRAD, borderRadius:3, transition:'width .5s ease' }} />
        </div>
      </div>

      {/* Orb + Question card */}
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:22, animation:'akFloat 3s ease-in-out infinite' }}>
          <FreydissMascot size={70} mood="thinking" />
        </div>

        <div style={{
          background: GLASS,
          border:`1px solid rgba(157,23,77,.22)`,
          borderRadius:22, padding:'30px 36px',
          backdropFilter:'blur(24px)',
          boxShadow:`0 24px 64px rgba(0,0,0,.45), inset 0 1px 0 rgba(249,168,212,.07)`,
        }}>
          <p style={{
            fontSize:'clamp(17px,3vw,22px)', fontWeight:700,
            color:TEXT, lineHeight:1.45, fontFamily:'var(--display)',
            margin:0,
          }}>{question.text}</p>
        </div>
      </div>

      {/* Answer grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {ANSWERS.map(a => (
          <button key={a.key} onClick={() => onAnswer(a.key)} style={{
            padding:'15px 12px', borderRadius:14,
            background:a.bg, border:`1px solid ${a.border}`,
            color:a.color, cursor:'pointer',
            fontSize:15, fontWeight:800, letterSpacing:'.02em',
            transition:'all .15s', fontFamily:'var(--body)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='scale(1.035)'; e.currentTarget.style.filter='brightness(1.12)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.filter='brightness(1)' }}
          >{a.label}</button>
        ))}
      </div>
    </motion.div>
  )
}

function GuessingScreen({ guess, qCount, onRight, onWrong }) {
  return (
    <motion.div initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:1.05 }}
      style={{ textAlign:'center', maxWidth:480, padding:'0 16px' }}>

      <p style={{ fontSize:13, fontWeight:700, letterSpacing:'.15em', color:MUTED, marginBottom:20, textTransform:'uppercase' }}>
        Après {qCount} question{qCount > 1 ? 's' : ''}, je pense que c'est…
      </p>

      {/* Character card */}
      <div style={{
        width:200, height:240, borderRadius:22, margin:'0 auto 28px',
        background:`linear-gradient(145deg, rgba(157,23,77,.28) 0%, rgba(76,29,149,.38) 100%)`,
        border:`2px solid rgba(157,23,77,.45)`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        boxShadow:`0 24px 70px rgba(157,23,77,.3), 0 0 120px rgba(76,29,149,.18)`,
        animation:'akPulse 2.5s ease-in-out infinite',
        backdropFilter:'blur(10px)',
        padding:'20px 16px',
      }}>
        <div style={{ fontSize:72, marginBottom:16, animation:'akFloat 3s ease-in-out infinite', lineHeight:1 }}>
          {guess.emoji}
        </div>
        <div style={{
          fontSize:15, fontWeight:800, color:TEXT,
          fontFamily:'var(--display)', textAlign:'center', lineHeight:1.3,
        }}>{guess.name}</div>
      </div>

      <p style={{ fontSize:15, color:MUTED, marginBottom:22 }}>Est-ce que j'ai raison ?</p>

      <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
        <button onClick={onRight} style={{
          padding:'14px 38px', borderRadius:100,
          background:'rgba(34,197,94,.15)', border:'2px solid rgba(34,197,94,.5)',
          color:'#4ade80', cursor:'pointer', fontSize:16, fontWeight:800,
          transition:'all .18s', fontFamily:'var(--body)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(34,197,94,.27)'; e.currentTarget.style.transform='scale(1.05)' }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(34,197,94,.15)'; e.currentTarget.style.transform='scale(1)' }}
        >✅ Oui !</button>

        <button onClick={onWrong} style={{
          padding:'14px 38px', borderRadius:100,
          background:'rgba(239,68,68,.15)', border:'2px solid rgba(239,68,68,.5)',
          color:'#f87171', cursor:'pointer', fontSize:16, fontWeight:800,
          transition:'all .18s', fontFamily:'var(--body)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.27)'; e.currentTarget.style.transform='scale(1.05)' }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,.15)'; e.currentTarget.style.transform='scale(1)' }}
        >❌ Non</button>
      </div>
    </motion.div>
  )
}

function WinScreen({ guess, qCount, onReplay }) {
  return (
    <motion.div initial={{ opacity:0, scale:.85 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
      transition={{ type:'spring', stiffness:260, damping:20 }}
      style={{ textAlign:'center', maxWidth:480, padding:'0 16px' }}>

      <div style={{ fontSize:56, marginBottom:14, animation:'akFloat 2s ease-in-out infinite' }}>🎉</div>

      <h2 style={{
        fontFamily:'var(--display)', fontSize:'clamp(24px,5vw,36px)', fontWeight:900,
        background:'linear-gradient(135deg, #4ade80, #22c55e)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        marginBottom:6,
      }}>J'avais raison !</h2>

      <p style={{ color:MUTED, marginBottom:28, fontSize:14 }}>
        Trouvé en <strong style={{ color:PINK_L }}>{qCount} question{qCount > 1 ? 's' : ''}</strong>
      </p>

      <div style={{
        width:170, height:210, borderRadius:20, margin:'0 auto 28px',
        background:'linear-gradient(145deg, rgba(34,197,94,.2), rgba(16,185,129,.28))',
        border:'2px solid rgba(34,197,94,.45)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        boxShadow:'0 20px 60px rgba(34,197,94,.22)',
        padding:16,
      }}>
        <div style={{ fontSize:64, marginBottom:12, lineHeight:1 }}>{guess.emoji}</div>
        <div style={{ fontSize:14, fontWeight:800, color:'#4ade80', fontFamily:'var(--display)', textAlign:'center', lineHeight:1.3 }}>
          {guess.name}
        </div>
      </div>

      <button onClick={onReplay} style={{
        padding:'14px 44px', borderRadius:100,
        background: GRAD, border:'none', cursor:'pointer',
        fontSize:16, fontWeight:800, color:'#fff',
        boxShadow:`0 8px 32px rgba(157,23,77,.45)`,
        transition:'all .2s', fontFamily:'var(--body)',
      }}
      onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
      >🔮 Rejouer</button>
    </motion.div>
  )
}

function LostScreen({ onReplay }) {
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
      style={{ textAlign:'center', maxWidth:480, padding:'0 16px' }}>

      <div style={{ fontSize:56, marginBottom:14 }}>😤</div>

      <h2 style={{
        fontFamily:'var(--display)', fontSize:'clamp(22px,4vw,32px)', fontWeight:900,
        color:PINK_L, marginBottom:10,
      }}>Je donne ma langue au chat !</h2>

      <p style={{ color:MUTED, marginBottom:12, lineHeight:1.65, fontSize:15 }}>
        Ce personnage a réussi à me battre…<br/>
        Il n'est peut-être pas encore dans ma base de données.
      </p>

      <p style={{ fontSize:12, color:'rgba(240,232,248,.28)', marginBottom:32 }}>
        Tu peux essayer avec un autre personnage !
      </p>

      <button onClick={onReplay} style={{
        padding:'14px 44px', borderRadius:100,
        background: GRAD, border:'none', cursor:'pointer',
        fontSize:16, fontWeight:800, color:'#fff',
        boxShadow:`0 8px 32px rgba(157,23,77,.45)`,
        transition:'all .2s', fontFamily:'var(--body)',
      }}
      onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
      >🔮 Rejouer</button>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const PHASE = { IDLE:'idle', ASKING:'asking', GUESSING:'guessing', WIN:'win', LOST:'lost' }

export default function AkinatorPage() {
  const navigate = useNavigate()
  const [phase,     setPhase]     = useState(PHASE.IDLE)
  const [remaining, setRemaining] = useState(CHARS)
  const [asked,     setAsked]     = useState(new Set())
  const [currentQ,  setCurrentQ]  = useState(null)
  const [qCount,    setQCount]    = useState(0)
  const [guess,     setGuess]     = useState(null)

  const stars = useMemo(() => Array.from({ length:45 }, (_, i) => ({
    id:i, x:(i*13.7+7)%100, y:(i*23.1+3)%100,
    size:0.5+(i%4)*0.4, dur:2+(i%5), del:(i*.3)%4,
  })), [])

  const startGame = useCallback(() => {
    const pool = CHARS
    const first = pickQuestion(pool, new Set())
    setPhase(PHASE.ASKING)
    setRemaining(pool)
    setAsked(new Set())
    setQCount(0)
    setGuess(null)
    setCurrentQ(first)
  }, [])

  const handleAnswer = useCallback((answer) => {
    if (!currentQ) return
    const newAsked = new Set(asked)
    newAsked.add(currentQ.id)
    const newRem = filterChars(remaining, currentQ.id, answer)
    const actual = newRem.length > 0 ? newRem : remaining
    const newQ   = qCount + 1

    setAsked(newAsked)
    setQCount(newQ)

    if (actual.length <= 2 || newQ >= 20) {
      setGuess(actual[0])
      setRemaining(actual)
      setPhase(PHASE.GUESSING)
    } else {
      const next = pickQuestion(actual, newAsked)
      if (!next) {
        setGuess(actual[0])
        setRemaining(actual)
        setPhase(PHASE.GUESSING)
      } else {
        setRemaining(actual)
        setCurrentQ(next)
      }
    }
  }, [currentQ, remaining, asked, qCount])

  const handleGuessRight = useCallback(() => setPhase(PHASE.WIN), [])

  const handleGuessWrong = useCallback(() => {
    const rest = remaining.filter(c => c.id !== guess?.id)
    if (rest.length === 0) {
      setPhase(PHASE.LOST)
    } else {
      // Continue asking with reduced pool
      const next = pickQuestion(rest, asked)
      if (!next || rest.length === 1) {
        setGuess(rest[0])
        setRemaining(rest)
        setPhase(PHASE.GUESSING)
      } else {
        setRemaining(rest)
        setCurrentQ(next)
        setPhase(PHASE.ASKING)
      }
    }
  }, [guess, remaining, asked])

  const reset = useCallback(() => {
    setPhase(PHASE.IDLE)
    setRemaining(CHARS)
    setAsked(new Set())
    setQCount(0)
    setGuess(null)
    setCurrentQ(null)
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:BG, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        @keyframes akStar   { 0%,100%{opacity:.25;transform:scale(1)} 50%{opacity:.9;transform:scale(1.6)} }
        @keyframes akPulse  { 0%,100%{box-shadow:0 0 30px rgba(157,23,77,.4),0 0 60px rgba(76,29,149,.2)} 50%{box-shadow:0 0 55px rgba(157,23,77,.7),0 0 110px rgba(76,29,149,.4)} }
        @keyframes akFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
      `}</style>

      {/* Stars */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {stars.map(s => (
          <div key={s.id} style={{
            position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
            width:s.size, height:s.size, borderRadius:'50%',
            background:'rgba(249,168,212,.55)',
            animation:`akStar ${s.dur}s ${s.del}s ease-in-out infinite`,
          }}/>
        ))}
      </div>

      {/* Gradient ambiance */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:`radial-gradient(ellipse at 50% 0%, rgba(157,23,77,.14) 0%, transparent 55%),
                   radial-gradient(ellipse at 80% 100%, rgba(76,29,149,.1) 0%, transparent 50%)`,
      }}/>

      {/* Navbar */}
      <div style={{
        flexShrink:0, height:62, display:'flex', alignItems:'center',
        padding:'0 24px', gap:16,
        borderBottom:`1px solid rgba(157,23,77,.18)`,
        background:'rgba(7,9,14,.92)', backdropFilter:'blur(22px)',
        position:'relative', zIndex:10,
      }}>
        <button onClick={() => navigate('/')} style={{
          display:'flex', alignItems:'center', gap:7,
          background:'rgba(157,23,77,.1)', border:`1px solid rgba(157,23,77,.28)`,
          borderRadius:10, color:PINK_L, cursor:'pointer',
          padding:'7px 14px', fontSize:13, fontWeight:700,
          transition:'all .16s',
        }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(157,23,77,.22)'}
        onMouseLeave={e => e.currentTarget.style.background='rgba(157,23,77,.1)'}
        >← Retour</button>

        <div style={{ flex:1, textAlign:'center' }}>
          <span style={{
            fontFamily:'var(--display)', fontWeight:900, fontSize:18,
            background:`linear-gradient(135deg, ${PINK_L} 0%, ${PINK_M} 50%, #c084fc 100%)`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>🔮 Akinator One Piece</span>
        </div>

        <div style={{ minWidth:88, display:'flex', justifyContent:'flex-end' }}>
          {phase !== PHASE.IDLE && (
            <button onClick={reset} style={{
              background:'transparent', border:`1px solid rgba(157,23,77,.22)`,
              borderRadius:8, color:MUTED, cursor:'pointer',
              padding:'6px 12px', fontSize:12, fontWeight:600, transition:'all .14s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color=PINK_L; e.currentTarget.style.borderColor='rgba(157,23,77,.5)' }}
            onMouseLeave={e => { e.currentTarget.style.color=MUTED; e.currentTarget.style.borderColor='rgba(157,23,77,.22)' }}
            >↺ Rejouer</button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', zIndex:2 }}>
        <AnimatePresence mode="wait">
          {phase === PHASE.IDLE     && <IdleScreen     key="idle"                  onStart={startGame} />}
          {phase === PHASE.ASKING   && currentQ        && <AskingScreen key={`q-${currentQ.id}`} question={currentQ} qCount={qCount} remaining={remaining.length} total={CHARS.length} onAnswer={handleAnswer} />}
          {phase === PHASE.GUESSING && guess           && <GuessingScreen key={`g-${guess.id}`}  guess={guess}       qCount={qCount} onRight={handleGuessRight} onWrong={handleGuessWrong} />}
          {phase === PHASE.WIN      && guess           && <WinScreen  key="win"  guess={guess} qCount={qCount} onReplay={reset} />}
          {phase === PHASE.LOST                        && <LostScreen key="lost"                                                 onReplay={reset} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
