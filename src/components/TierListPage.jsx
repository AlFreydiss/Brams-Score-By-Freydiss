import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import confetti from 'canvas-confetti'
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  Star, Search, Download, Shuffle, RotateCcw,
  Save, Upload, X, Edit3, Check, Trash2, Crown, ArrowLeft,
} from 'lucide-react'

// ── Tiers config ─────────────────────────────────────────────────────────────

const TIERS = [
  { id:'top10', label:'TOP 10', color:'#FF1744', bg:'linear-gradient(135deg,#b71c1c,#880e4f)', glow:'rgba(255,23,68,.55)',  icon:<Crown size={13}/> },
  { id:'s',     label:'S',      color:'#FFD700', bg:'linear-gradient(135deg,#f59f00,#e65100)', glow:'rgba(255,215,0,.60)',  icon:'⭐' },
  { id:'a',     label:'A',      color:'#00E676', bg:'linear-gradient(135deg,#1b5e20,#2e7d32)', glow:'rgba(0,230,118,.45)', icon:'🔥' },
  { id:'b',     label:'B',      color:'#40C4FF', bg:'linear-gradient(135deg,#01579b,#0277bd)', glow:'rgba(64,196,255,.40)',icon:'💫' },
  { id:'c',     label:'C',      color:'#CE93D8', bg:'linear-gradient(135deg,#4a148c,#6a1b9a)', glow:'rgba(206,147,216,.38)',icon:'⚡' },
  { id:'d',     label:'D',      color:'#FFAB40', bg:'linear-gradient(135deg,#bf360c,#e65100)', glow:'rgba(255,171,64,.38)',icon:'💢' },
  { id:'f',     label:'F',      color:'#FF5252', bg:'linear-gradient(135deg,#880e4f,#b71c1c)', glow:'rgba(255,82,82,.38)', icon:'💀' },
  { id:'trash', label:'TRASH',  color:'#78909C', bg:'linear-gradient(135deg,#263238,#37474f)', glow:'rgba(120,144,156,.28)',icon:<Trash2 size={12}/> },
]

// ── Datasets ──────────────────────────────────────────────────────────────────

// img = primary, img2 = fallback
const ANIME_LIST = [
  { id:'a01', name:'Fullmetal Alchemist', sub:'Brotherhood', year:2009, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1223/96541.jpg' },
  { id:'a02', name:'Attack on Titan', sub:'Shingeki no Kyojin', year:2013, genres:['Action','Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
  { id:'a03', name:'Death Note', sub:'デスノート', year:2006, genres:['Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/9/9453.jpg' },
  { id:'a04', name:'One Piece', sub:'1000+ épisodes', year:1999, genres:['Action','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id:'a05', name:'Demon Slayer', sub:'Kimetsu no Yaiba', year:2019, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
  { id:'a06', name:'Jujutsu Kaisen', sub:'呪術廻戦', year:2020, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
  { id:'a07', name:'Hunter x Hunter', sub:'2011', year:2011, genres:['Action','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/11/33657.jpg' },
  { id:'a08', name:'Steins;Gate', sub:'シュタインズ・ゲート', year:2011, genres:['Sci-Fi','Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/5/73199.jpg' },
  { id:'a09', name:'Code Geass', sub:'Hangyaku no Lelouch', year:2006, genres:['Action','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/1/30601.jpg' },
  { id:'a10', name:'Naruto Shippuden', sub:'ナルト 疾風伝', year:2007, genres:['Action','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/3/72078.jpg' },
  { id:'a11', name:'Dragon Ball Z', sub:'ドラゴンボールZ', year:1989, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/5/16038.jpg' },
  { id:'a12', name:'My Hero Academia', sub:'Boku no Hero', year:2016, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/10/78745.jpg' },
  { id:'a13', name:'Tokyo Ghoul', sub:'東京喰種', year:2014, genres:['Action','Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/9/52986.jpg' },
  { id:'a14', name:'Vinland Saga', sub:'ヴィンランド・サガ', year:2019, genres:['Action','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/1500/103005.jpg' },
  { id:'a15', name:'Mob Psycho 100', sub:'モブサイコ100', year:2016, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/8/80356.jpg' },
  { id:'a16', name:'Chainsaw Man', sub:'チェンソーマン', year:2022, genres:['Action','Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/1806/126216.jpg' },
  { id:'a17', name:'Promised Neverland', sub:'Yakusoku no Neverland', year:2019, genres:['Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/1171/97397.jpg' },
  { id:'a18', name:'Re:Zero', sub:'Starting Life in Another World', year:2016, genres:['Fantasy','Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/11/79410.jpg' },
  { id:'a19', name:'Blue Lock', sub:'ブルーロック', year:2022, genres:['Sport','Action'],
    img:'https://cdn.myanimelist.net/images/anime/1258/122072.jpg' },
  { id:'a20', name:'Dr. Stone', sub:'ドクターストーン', year:2019, genres:['Action','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/1667/105038.jpg' },
  { id:'a21', name:'Bleach', sub:'ブリーチ', year:2004, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/3/20235.jpg' },
  { id:'a22', name:'Black Clover', sub:'ブラッククローバー', year:2017, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/2/88336.jpg' },
  { id:'a23', name:'Sword Art Online', sub:'ソードアート・オンライン', year:2012, genres:['Action','Romance'],
    img:'https://cdn.myanimelist.net/images/anime/11/39717.jpg' },
  { id:'a24', name:'Seven Deadly Sins', sub:'Nanatsu no Taizai', year:2014, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/8/65409.jpg' },
  { id:'a25', name:'Fire Force', sub:'Enen no Shouboutai', year:2019, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1083/105904.jpg' },
  { id:'a26', name:'Solo Leveling', sub:'俺だけレベルアップな件', year:2024, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1987/144973.jpg' },
  { id:'a27', name:'Overlord', sub:'オーバーロード', year:2015, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/13/73545.jpg',
    img2:'https://cdn.myanimelist.net/images/anime/9/49729.jpg' },
  { id:'a28', name:'Violet Evergarden', sub:'ヴァイオレット・エヴァーガーデン', year:2018, genres:['Fantasy','Romance'],
    img:'https://cdn.myanimelist.net/images/anime/1825/110716.jpg' },
  { id:'a29', name:'Made in Abyss', sub:'メイドインアビス', year:2017, genres:['Aventure','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/6/86733.jpg' },
  { id:'a30', name:'Neon Genesis Evangelion', sub:'エヴァンゲリオン', year:1995, genres:['Action','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/1314/108941.jpg' },
  { id:'a31', name:'Cowboy Bebop', sub:'カウボーイビバップ', year:1998, genres:['Action','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/4/19644.jpg' },
  { id:'a32', name:'Gurren Lagann', sub:'天元突破グレンラガン', year:2007, genres:['Action','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/4/26551.jpg' },
  { id:'a33', name:"JoJo's Bizarre Adventure", sub:'ジョジョの奇妙な冒険', year:2012, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/3/40409.jpg' },
  { id:'a34', name:'Spy x Family', sub:'スパイファミリー', year:2022, genres:['Action','Romance'],
    img:'https://cdn.myanimelist.net/images/anime/1441/122795.jpg' },
  { id:'a35', name:'Oshi no Ko', sub:'推しの子', year:2023, genres:['Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/1812/134736.jpg' },
  { id:'a36', name:'Kingdom', sub:'キングダム', year:2012, genres:['Action','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/3/57491.jpg' },
  { id:'a37', name:'Naruto', sub:'ナルト', year:2002, genres:['Action','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/13/17405.jpg' },
  { id:'a38', name:'Dragon Ball Super', sub:'ドラゴンボール超', year:2015, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/7/74903.jpg',
    img2:'https://cdn.myanimelist.net/images/anime/1015/63974.jpg' },
  { id:'a39', name:'Hellsing Ultimate', sub:'ヘルシング OVA', year:2006, genres:['Action','Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/10/15525.jpg',
    img2:'https://cdn.myanimelist.net/images/anime/1/30603.jpg' },
  { id:'a40', name:'Your Name', sub:'君の名は。', year:2016, genres:['Romance','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/5/87048.jpg' },
]

const PERSO_LIST = [
  { id:'p01', name:'Monkey D. Luffy',  sub:'One Piece',         year:1999, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/9/310307.jpg' },
  { id:'p02', name:'Naruto Uzumaki',   sub:'Naruto Shippuden',  year:2002, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/14/164519.jpg' },
  { id:'p03', name:'Son Goku',         sub:'Dragon Ball Z',     year:1986, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/5/37165.jpg' },
  { id:'p04', name:'Levi Ackerman',    sub:'Attack on Titan',   year:2013, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/2/241413.jpg' },
  { id:'p05', name:'Gojo Satoru',      sub:'Jujutsu Kaisen',    year:2020, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/8/394157.jpg' },
  { id:'p06', name:'L Lawliet',        sub:'Death Note',        year:2006, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/10/8269.jpg' },
  { id:'p07', name:'Killua Zoldyck',   sub:'Hunter x Hunter',   year:2011, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/4/60141.jpg' },
  { id:'p08', name:'Itachi Uchiha',    sub:'Naruto Shippuden',  year:2002, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/14/64218.jpg' },
  { id:'p09', name:'Roronoa Zoro',     sub:'One Piece',         year:1999, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/14/324588.jpg' },
  { id:'p10', name:'Light Yagami',     sub:'Death Note',        year:2006, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/8/8286.jpg' },
  { id:'p11', name:'Edward Elric',     sub:'FMA Brotherhood',   year:2009, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/7/97789.jpg' },
  { id:'p12', name:'Eren Yeager',      sub:'Attack on Titan',   year:2013, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/10/216895.jpg' },
  { id:'p13', name:'Tanjiro Kamado',   sub:'Demon Slayer',      year:2019, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/1/392387.jpg' },
  { id:'p14', name:'Yuji Itadori',     sub:'Jujutsu Kaisen',    year:2020, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/9/436971.jpg' },
  { id:'p15', name:'Kakashi Hatake',   sub:'Naruto Shippuden',  year:2002, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/7/284847.jpg' },
  { id:'p16', name:'Vegeta',           sub:'Dragon Ball Z',     year:1986, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/2/54540.jpg' },
  { id:'p17', name:'Lelouch vi Britannia', sub:'Code Geass',    year:2006, genres:['Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/characters/5/183245.jpg' },
  { id:'p18', name:'Izuku Midoriya',   sub:'My Hero Academia',  year:2016, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/3/342118.jpg' },
  { id:'p19', name:'Ken Kaneki',       sub:'Tokyo Ghoul',       year:2014, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/9/311090.jpg' },
  { id:'p20', name:'Okabe Rintarou',   sub:'Steins;Gate',       year:2011, genres:['Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/characters/2/236268.jpg' },
  { id:'p21', name:'Meruem',           sub:'Hunter x Hunter',   year:2011, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/7/288569.jpg' },
  { id:'p22', name:'Shigeo Kageyama',  sub:'Mob Psycho 100',    year:2016, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/4/302756.jpg' },
  { id:'p23', name:'Nezuko Kamado',    sub:'Demon Slayer',      year:2019, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/3/402033.jpg' },
  { id:'p24', name:'Makima',           sub:'Chainsaw Man',      year:2022, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/4/464441.jpg' },
  { id:'p25', name:'Mikasa Ackerman',  sub:'Attack on Titan',   year:2013, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/15/245009.jpg' },
  { id:'p26', name:'Gon Freecss',      sub:'Hunter x Hunter',   year:2011, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/5/60139.jpg' },
  { id:'p27', name:'Denji',            sub:'Chainsaw Man',      year:2022, genres:['Seinen'],
    img:'https://cdn.myanimelist.net/images/characters/6/462199.jpg' },
  { id:'p28', name:'Yor Forger',       sub:'Spy x Family',      year:2022, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/characters/1/518517.jpg' },
  { id:'p29', name:'Ryuk',             sub:'Death Note',        year:2006, genres:['Thriller'],
    img:'https://cdn.myanimelist.net/images/characters/7/8283.jpg' },
  { id:'p30', name:'Gon Freecss',      sub:'Hunter x Hunter',   year:2011, genres:['Shonen'],
    img:'https://cdn.myanimelist.net/images/characters/10/92545.jpg' },
]

// Arcs — réutilise les posters anime en guise d'image d'arc
const ARC_LIST = [
  { id:'arc01', name:'Marineford War',        sub:'One Piece',         year:2010, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id:'arc02', name:'Chimera Ant',           sub:'Hunter x Hunter',   year:2012, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/11/33657.jpg' },
  { id:'arc03', name:'Shibuya Incident',      sub:'Jujutsu Kaisen',    year:2023, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
  { id:'arc04', name:'Final Season',          sub:'Attack on Titan',   year:2020, genres:['Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
  { id:'arc05', name:'Mugen Train',           sub:'Demon Slayer',      year:2020, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
  { id:'arc06', name:'Pain Attack',           sub:'Naruto Shippuden',  year:2009, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/3/72078.jpg' },
  { id:'arc07', name:'Enies Lobby',           sub:'One Piece',         year:2006, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id:'arc08', name:'Greed Island',          sub:'Hunter x Hunter',   year:2012, genres:['Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/11/33657.jpg' },
  { id:'arc09', name:'Yorknew City',          sub:'Hunter x Hunter',   year:2011, genres:['Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/11/33657.jpg' },
  { id:'arc10', name:'Alabasta',              sub:'One Piece',         year:2001, genres:['Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id:'arc11', name:'Return to Shiganshina', sub:'Attack on Titan',   year:2019, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
  { id:'arc12', name:'Mugen Train Arc',       sub:'Demon Slayer',      year:2021, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
  { id:'arc13', name:'Election Arc',          sub:'Hunter x Hunter',   year:2014, genres:['Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/11/33657.jpg' },
  { id:'arc14', name:'Soul Society Arc',      sub:'Bleach',            year:2004, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/3/20235.jpg' },
  { id:'arc15', name:'Thousand Year Blood War', sub:'Bleach TYBW',     year:2022, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/3/20235.jpg' },
  { id:'arc16', name:'Tournament of Power',   sub:'Dragon Ball Super', year:2017, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/7/74903.jpg' },
  { id:'arc17', name:'Cell Games',            sub:'Dragon Ball Z',     year:1992, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/5/16038.jpg' },
  { id:'arc18', name:'Wano',                  sub:'One Piece',         year:2019, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id:'arc19', name:'Sanctuary Arc',         sub:'Re:Zero S2',        year:2020, genres:['Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/11/79410.jpg' },
  { id:'arc20', name:'Final Exam',            sub:'Jujutsu Kaisen',    year:2021, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
  { id:'arc21', name:'Paranormal Liberation War', sub:'My Hero Academia', year:2021, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/10/78745.jpg' },
  { id:'arc22', name:'Abyss Layer 2',         sub:'Made in Abyss',    year:2017, genres:['Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/6/86733.jpg' },
  { id:'arc23', name:'Invasion Arc',          sub:'Solo Leveling',    year:2024, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/1987/144973.jpg' },
  { id:'arc24', name:'Holy War',              sub:'Seven Deadly Sins', year:2018, genres:['Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/8/65409.jpg' },
  { id:'arc25', name:'Forger Family Origins', sub:'Spy x Family',     year:2022, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/1441/122795.jpg' },
]

const FILM_LIST = [
  { id:'f01', name:'Your Name', sub:'Makoto Shinkai', year:2016, genres:['Romance','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/5/87048.jpg' },
  { id:'f02', name:'Spirited Away', sub:'Studio Ghibli', year:2001, genres:['Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/6/79597.jpg' },
  { id:'f03', name:"Princess Mononoke", sub:'Studio Ghibli', year:1997, genres:['Fantasy','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/7/75919.jpg' },
  { id:'f04', name:'Mugen Train', sub:'Demon Slayer Movie', year:2020, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
  { id:'f05', name:'Jujutsu Kaisen 0', sub:'JJK Movie', year:2021, genres:['Action','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
  { id:'f06', name:'Dragon Ball Super: Broly', sub:'DBS Film', year:2018, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/5/16038.jpg' },
  { id:'f07', name:'One Piece: Red', sub:'OP Film', year:2022, genres:['Action','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id:'f08', name:'Evangelion 3.0+1.0', sub:'Rebuild of Eva', year:2021, genres:['Sci-Fi','Action'],
    img:'https://cdn.myanimelist.net/images/anime/1314/108941.jpg' },
  { id:'f09', name:'Howl\'s Moving Castle', sub:'Studio Ghibli', year:2004, genres:['Fantasy','Romance'],
    img:'https://cdn.myanimelist.net/images/anime/5/75810.jpg' },
  { id:'f10', name:'My Neighbor Totoro', sub:'Studio Ghibli', year:1988, genres:['Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/6/75954.jpg' },
  { id:'f11', name:'Weathering with You', sub:'Makoto Shinkai', year:2019, genres:['Romance','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1764/98929.jpg' },
  { id:'f12', name:'A Silent Voice', sub:'KyoAni', year:2016, genres:['Romance','Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/5/87048.jpg' },
  { id:'f13', name:'Suzume', sub:'Makoto Shinkai', year:2022, genres:['Fantasy','Romance'],
    img:'https://cdn.myanimelist.net/images/anime/1764/98929.jpg' },
  { id:'f14', name:'Nausicaa of the Valley', sub:'Studio Ghibli', year:1984, genres:['Fantasy','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/7/75919.jpg' },
  { id:'f15', name:'Castle in the Sky', sub:'Studio Ghibli', year:1986, genres:['Fantasy','Aventure'],
    img:'https://cdn.myanimelist.net/images/anime/7/75919.jpg' },
  { id:'f16', name:'Promare', sub:'Studio Trigger', year:2019, genres:['Action','Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/1083/105904.jpg' },
  { id:'f17', name:'Akira', sub:'Katsuhiro Otomo', year:1988, genres:['Sci-Fi','Thriller'],
    img:'https://cdn.myanimelist.net/images/anime/4/19644.jpg' },
  { id:'f18', name:'Ghost in the Shell', sub:'Mamoru Oshii', year:1995, genres:['Sci-Fi'],
    img:'https://cdn.myanimelist.net/images/anime/4/19644.jpg' },
  { id:'f19', name:'DBZ: Battle of Gods', sub:'Dragon Ball Z', year:2013, genres:['Action'],
    img:'https://cdn.myanimelist.net/images/anime/5/16038.jpg' },
  { id:'f20', name:'Violet Evergarden Movie', sub:'KyoAni', year:2020, genres:['Romance','Fantasy'],
    img:'https://cdn.myanimelist.net/images/anime/1825/110716.jpg' },
]

// ── Tier Types ────────────────────────────────────────────────────────────────

const TIER_TYPES = [
  { id:'anime',  label:'Animes',       icon:'🎬', color:'#FF1744', grad:'linear-gradient(135deg,#b71c1c,#e53935)',
    desc:'40 séries légendaires',  count:40, items:ANIME_LIST,  popular:true  },
  { id:'persos', label:'Personnages',  icon:'👤', color:'#FFD700', grad:'linear-gradient(135deg,#f59f00,#fbc02d)',
    desc:'30 héros & antagonistes', count:30, items:PERSO_LIST               },
  { id:'arcs',   label:'Arcs',         icon:'🗺️', color:'#00E676', grad:'linear-gradient(135deg,#1b5e20,#388e3c)',
    desc:'25 arcs épiques',         count:25, items:ARC_LIST                 },
  { id:'films',  label:'Films & OAV',  icon:'🎥', color:'#40C4FF', grad:'linear-gradient(135deg,#01579b,#0288d1)',
    desc:'20 films d\'animation',   count:20, items:FILM_LIST                },
  { id:'combats',label:'Combats',      icon:'⚔️', color:'#CE93D8', grad:'linear-gradient(135deg,#4a148c,#7b1fa2)',
    desc:'Bientôt disponible',      count:0,  items:[],          soon:true   },
  { id:'ost',    label:'OST & Openings',icon:'🎵', color:'#FFAB40', grad:'linear-gradient(135deg,#bf360c,#f57c00)',
    desc:'Bientôt disponible',      count:0,  items:[],          soon:true   },
]

// ── Storage key ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'brams_tierlist_v4'

function initBoard(items) {
  return {
    top10:[], s:[], a:[], b:[], c:[], d:[], f:[], trash:[],
    pool: items.map(a => a.id),
  }
}

// ── Confetti S ────────────────────────────────────────────────────────────────

function fireSTierConfetti() {
  const end = Date.now() + 2800
  const colors = ['#FFD700','#FF1744','#ffffff','#f59f00']
  const shoot = () => {
    confetti({ particleCount:4, angle:60,  spread:60, origin:{x:0}, colors, zIndex:99999 })
    confetti({ particleCount:4, angle:120, spread:60, origin:{x:1}, colors, zIndex:99999 })
    if (Date.now() < end) requestAnimationFrame(shoot)
  }
  shoot()
  confetti({ particleCount:60, spread:100, origin:{x:.5,y:.4}, colors, zIndex:99999 })
}

// ── Particles canvas ──────────────────────────────────────────────────────────

function ParticleCanvas() {
  const cvs = useRef(null)
  const mxy = useRef({ x:-1000, y:-1000 })
  useEffect(() => {
    const canvas = cvs.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const PAL = ['#FFD70030','#FF174430','#40C4FF30','#CE93D830','#00E67630','#FFAB4030']
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const pts = Array.from({length:85}, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      vx:(Math.random()-.5)*.22, vy:(Math.random()-.5)*.16,
      r: Math.random()*1.5+.5, col:PAL[Math.floor(Math.random()*PAL.length)],
      ph:Math.random()*Math.PI*2,
    }))
    let raf, t=0
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height); t+=.01
      for (const p of pts) {
        const dx=p.x-mxy.current.x, dy=p.y-mxy.current.y, d2=dx*dx+dy*dy
        if (d2<9000) { const d=Math.sqrt(d2), f=(95-d)/95; p.vx+=(dx/d)*f*.07; p.vy+=(dy/d)*f*.07 }
        p.vx*=.976; p.vy*=.976
        p.x+=p.vx+Math.sin(t+p.ph)*.17; p.y+=p.vy+Math.cos(t*.7+p.ph)*.11
        if (p.x<0) p.x=canvas.width; if (p.x>canvas.width) p.x=0
        if (p.y<0) p.y=canvas.height; if (p.y>canvas.height) p.y=0
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=p.col; ctx.fill()
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*5)
        g.addColorStop(0,p.col); g.addColorStop(1,'transparent')
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*5,0,Math.PI*2); ctx.fillStyle=g; ctx.fill()
      }
      raf=requestAnimationFrame(draw)
    }
    draw()
    const onMove = e => { mxy.current={x:e.clientX,y:e.clientY} }
    window.addEventListener('mousemove',onMove)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize); window.removeEventListener('mousemove',onMove) }
  }, [])
  return <canvas ref={cvs} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.6}}/>
}

// ── Type Selector (landing) ───────────────────────────────────────────────────

function TypeSelector({ onSelect }) {
  return (
    <motion.div
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      exit={{ opacity:0, scale:.97 }}
      transition={{ duration:.4 }}
      style={{
        position:'fixed', inset:0, zIndex:10,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'20px 16px',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ y:-24, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:.1 }}
        style={{ textAlign:'center', marginBottom:44 }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:12 }}>
          <span style={{ fontSize:28 }}>⚔️</span>
          <span style={{ fontSize:22, fontWeight:900, letterSpacing:'.04em' }}>
            BRAMS<span style={{ color:'#FF1744' }}>.TIER</span>
          </span>
        </div>
        <h1 style={{ margin:0, fontSize:'clamp(22px,3vw,34px)', fontWeight:900, color:'#fff', letterSpacing:'-.02em', lineHeight:1.1 }}>
          Quelle tier list tu veux faire ?
        </h1>
        <p style={{ margin:'10px 0 0', fontSize:14, color:'rgba(255,255,255,0.45)' }}>
          Choisis une catégorie pour commencer
        </p>
      </motion.div>

      {/* Cards grid */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',
        gap:16, width:'100%', maxWidth:900,
      }}>
        {TIER_TYPES.map((type, i) => (
          <motion.button
            key={type.id}
            initial={{ y:30, opacity:0 }} animate={{ y:0, opacity:1 }}
            transition={{ delay:.15 + i*.07, type:'spring', stiffness:280, damping:24 }}
            whileHover={type.soon ? {} : { scale:1.04, y:-4 }}
            whileTap={type.soon ? {} : { scale:.97 }}
            onClick={() => !type.soon && onSelect(type)}
            style={{
              position:'relative', overflow:'hidden',
              padding:'24px 18px',
              background: type.soon
                ? 'rgba(255,255,255,0.03)'
                : 'rgba(255,255,255,0.05)',
              border:`1px solid ${type.soon ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.10)'}`,
              borderRadius:16, cursor: type.soon ? 'default' : 'pointer',
              textAlign:'left', color:'#fff',
              backdropFilter:'blur(12px)',
              boxShadow: type.soon ? 'none' : '0 4px 24px rgba(0,0,0,0.3)',
              opacity: type.soon ? .45 : 1,
              transition:'border-color .2s, box-shadow .2s',
            }}
            onMouseEnter={e => {
              if (!type.soon) {
                e.currentTarget.style.borderColor = type.color + '55'
                e.currentTarget.style.boxShadow = `0 8px 40px ${type.color}22`
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'
            }}
          >
            {/* Gradient accent line */}
            {!type.soon && (
              <div style={{
                position:'absolute', top:0, left:0, right:0, height:2,
                background: type.grad, borderRadius:'16px 16px 0 0',
              }}/>
            )}

            {/* Popular badge */}
            {type.popular && (
              <div style={{
                position:'absolute', top:10, right:10,
                background:'#FF1744', color:'#fff',
                fontSize:8, fontWeight:800, letterSpacing:'.12em',
                padding:'2px 7px', borderRadius:100,
              }}>POPULAIRE</div>
            )}

            {/* Soon badge */}
            {type.soon && (
              <div style={{
                position:'absolute', top:10, right:10,
                background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)',
                fontSize:8, fontWeight:800, letterSpacing:'.12em',
                padding:'2px 7px', borderRadius:100,
              }}>BIENTÔT</div>
            )}

            <div style={{ fontSize:34, marginBottom:12, lineHeight:1 }}>{type.icon}</div>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4, color: type.soon ? 'rgba(255,255,255,0.4)' : '#fff' }}>
              {type.label}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.38)', marginBottom:12 }}>
              {type.desc}
            </div>
            {!type.soon && (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'3px 10px', borderRadius:100,
                background: type.color + '18',
                border: `1px solid ${type.color}35`,
                color: type.color, fontSize:11, fontWeight:700,
              }}>
                {type.count} entrées
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

// ── Anime card (draggable) ────────────────────────────────────────────────────

function ItemCard({ itemId, allById, compact=false, isDragOverlay=false }) {
  const item = allById[itemId]
  const [imgSrc, setImgSrc] = useState(item?.img || '')
  const [imgErr, setImgErr] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: itemId })
  const W = compact ? 76 : 88
  const H = compact ? 108 : 124

  const handleError = () => {
    if (item?.img2 && imgSrc !== item.img2) { setImgSrc(item.img2) }
    else { setImgErr(true) }
  }

  return (
    <motion.div
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={isDragOverlay ? { scale:1.08, rotate:2 } : { scale:1 }}
      whileHover={isDragOverlay ? {} : { scale:1.07, y:-3 }}
      transition={{ type:'spring', stiffness:300, damping:22 }}
      style={{
        width:W, height:H, borderRadius:10, overflow:'hidden', flexShrink:0,
        cursor: isDragging ? 'grabbing' : 'grab',
        position:'relative',
        opacity: isDragging && !isDragOverlay ? 0.3 : 1,
        transform: transform && !isDragOverlay ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        boxShadow: hovered || isDragOverlay
          ? '0 8px 30px rgba(0,0,0,.7), 0 0 0 1.5px rgba(255,255,255,.22)'
          : '0 2px 10px rgba(0,0,0,.5)',
        userSelect:'none',
        zIndex: isDragging && !isDragOverlay ? 1000 : 'auto',
      }}
    >
      {imgErr ? (
        <div style={{
          width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:6,
          background:`linear-gradient(135deg,#1a1a2e,#16213e)`, textAlign:'center',
        }}>
          <span style={{ fontSize:9, color:'rgba(255,255,255,.5)', fontWeight:600, lineHeight:1.3 }}>{item?.name}</span>
        </div>
      ) : (
        <img src={imgSrc} alt={item?.name} onError={handleError}
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} draggable={false} />
      )}

      <div style={{
        position:'absolute', inset:0,
        background: hovered
          ? 'linear-gradient(to top,rgba(0,0,0,.92) 55%,rgba(0,0,0,.08) 100%)'
          : 'linear-gradient(to top,rgba(0,0,0,.80) 38%,transparent 100%)',
        transition:'background .18s',
      }}>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'5px 5px 4px' }}>
          <div style={{
            fontSize: hovered ? 9.5 : 9, fontWeight:700, color:'#fff', lineHeight:1.25,
            overflow:'hidden', textOverflow:'ellipsis',
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
            transition:'font-size .18s',
          }}>
            {item?.name}
          </div>
          {hovered && <div style={{ fontSize:8, color:'rgba(255,255,255,.45)', marginTop:2 }}>{item?.year}</div>}
        </div>
      </div>

      {hovered && (
        <motion.div
          initial={{ opacity:0, x:-80 }} animate={{ opacity:[0,.4,0], x:['-100%','200%'] }}
          transition={{ duration:.55 }}
          style={{ position:'absolute', inset:0, pointerEvents:'none',
            background:'linear-gradient(105deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%)' }}
        />
      )}
    </motion.div>
  )
}

// ── Tier row ──────────────────────────────────────────────────────────────────

function TierRow({ tier, items, allById }) {
  const { isOver, setNodeRef } = useDroppable({ id: tier.id })
  return (
    <div style={{
      display:'flex', alignItems:'stretch',
      borderBottom:'1px solid rgba(255,255,255,.05)', minHeight:96,
      background: isOver ? 'rgba(255,255,255,.04)' : 'transparent',
      transition:'background .2s',
    }}>
      <div style={{
        width:76, flexShrink:0, background:tier.bg,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
        boxShadow: isOver ? `0 0 22px ${tier.glow}` : 'none',
        transition:'box-shadow .25s', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:0, bottom:0, width:1, left:0, background:`linear-gradient(to bottom,transparent,${tier.color}88,transparent)` }}/>
        <span style={{ fontSize: typeof tier.icon === 'string' ? 16 : 12, lineHeight:1 }}>{tier.icon}</span>
        <span style={{
          fontSize: tier.label.length>2 ? 10 : 22, fontWeight:900, color:'#fff', lineHeight:1,
          textShadow:`0 0 18px ${tier.glow}`, letterSpacing: tier.label.length>2 ? '.04em' : '-.01em',
          fontFamily:'serif',
        }}>{tier.label}</span>
      </div>
      <div ref={setNodeRef} style={{
        flex:1, display:'flex', flexWrap:'wrap', gap:6, padding:'8px 12px',
        alignContent:'flex-start', alignItems:'flex-start', minHeight:96,
        outline: isOver ? `2px dashed ${tier.color}88` : '2px dashed transparent',
        outlineOffset:-4, borderRadius:4, transition:'outline .2s', position:'relative',
      }}>
        {items.length===0 && !isOver && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            color:'rgba(255,255,255,.10)', fontSize:12, pointerEvents:'none' }}>
            Glisse ici
          </div>
        )}
        {items.map(id => <ItemCard key={id} itemId={id} allById={allById} compact/>)}
      </div>
    </div>
  )
}

// ── Pool ──────────────────────────────────────────────────────────────────────

function ItemPool({ items, allById, favorites, onToggleFav, search, onSearch, genre, onGenre, currentType }) {
  const { isOver, setNodeRef } = useDroppable({ id:'pool' })
  const genres = useMemo(() => ['Tous', ...new Set(currentType.items.flatMap(a => a.genres || []))], [currentType])

  const filtered = useMemo(() => {
    const fav  = items.filter(id => favorites.includes(id))
    const rest = items.filter(id => !favorites.includes(id))
    const q = search.toLowerCase()
    return [...fav, ...rest].filter(id => {
      const a = allById[id]; if (!a) return false
      const mq = !q || a.name.toLowerCase().includes(q) || (a.sub||'').toLowerCase().includes(q)
      const mg = genre==='Tous' || (a.genres||[]).includes(genre)
      return mq && mg
    })
  }, [items, favorites, search, genre, allById])

  return (
    <div style={{ background:'rgba(0,0,0,.55)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(255,255,255,.07)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,.05)', flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:800, letterSpacing:'.12em', color:'rgba(255,255,255,.4)', textTransform:'uppercase', whiteSpace:'nowrap' }}>
          {currentType.icon} Pool · {filtered.length}
        </span>
        <div style={{ position:'relative', flex:'1 1 140px', minWidth:110, maxWidth:240 }}>
          <Search size={11} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.3)' }}/>
          <input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Rechercher…"
            style={{ width:'100%', height:30, paddingLeft:26, paddingRight:10, background:'rgba(255,255,255,.06)',
              border:'1px solid rgba(255,255,255,.08)', borderRadius:8, color:'#fff', fontSize:12, outline:'none' }}/>
          {search && <button onClick={()=>onSearch('')} style={{ position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',
            background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.4)',padding:0 }}><X size={11}/></button>}
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {genres.map(g => (
            <button key={g} onClick={()=>onGenre(g)} style={{
              padding:'2px 9px', borderRadius:100, border:'none', cursor:'pointer',
              fontSize:10, fontWeight:700,
              background: genre===g ? '#FF1744' : 'rgba(255,255,255,.07)',
              color: genre===g ? '#fff' : 'rgba(255,255,255,.4)',
              transition:'all .15s',
            }}>{g}</button>
          ))}
        </div>
      </div>
      <div ref={setNodeRef} style={{
        display:'flex', flexWrap:'wrap', gap:7, padding:'9px 13px',
        overflowY:'auto', maxHeight:250,
        outline: isOver ? '2px dashed rgba(255,255,255,.22)' : '2px dashed transparent',
        outlineOffset:-4, borderRadius:6,
        scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,.1) transparent',
      }}>
        {filtered.map(id => (
          <div key={id} style={{ position:'relative' }}>
            <ItemCard itemId={id} allById={allById}/>
            <button onClick={()=>onToggleFav(id)} style={{
              position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%',
              background: favorites.includes(id) ? 'rgba(255,215,0,.85)' : 'rgba(0,0,0,.55)',
              border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all .18s',
            }}>
              <Star size={10} fill={favorites.includes(id)?'#fff':'none'} color={favorites.includes(id)?'#fff':'rgba(255,255,255,.6)'}/>
            </button>
          </div>
        ))}
        {!filtered.length && (
          <div style={{ color:'rgba(255,255,255,.22)', fontSize:13, padding:'18px 0', width:'100%', textAlign:'center' }}>
            Aucun résultat
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }) {
  useEffect(() => { const t=setTimeout(onDone,2400); return ()=>clearTimeout(t) }, [onDone])
  return (
    <motion.div initial={{opacity:0,y:28,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16}}
      style={{
        position:'fixed',bottom:30,left:'50%',transform:'translateX(-50%)',zIndex:99998,
        background:'rgba(18,18,28,.96)',backdropFilter:'blur(16px)',
        border:'1px solid rgba(255,255,255,.12)',borderRadius:12,
        padding:'9px 20px',color:'#fff',fontSize:13,fontWeight:600,
        boxShadow:'0 8px 32px rgba(0,0,0,.5)',whiteSpace:'nowrap',
      }}>
      {msg}
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TierListPage() {
  const [selectedType, setSelectedType] = useState(null)
  const [board,        setBoard]        = useState(null)
  const [favorites,    setFavorites]    = useState([])
  const [title,        setTitle]        = useState('Ma Tier List 🔥')
  const [editTitle,    setEditTitle]    = useState(false)
  const [tmpTitle,     setTmpTitle]     = useState(title)
  const [search,       setSearch]       = useState('')
  const [genre,        setGenre]        = useState('Tous')
  const [activeId,     setActiveId]     = useState(null)
  const [toast,        setToast]        = useState(null)
  const boardRef   = useRef(null)
  const titleRef   = useRef(null)

  const allById = useMemo(() =>
    selectedType ? Object.fromEntries(selectedType.items.map(a => [a.id, a])) : {}
  , [selectedType])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint:{ distance:6 } }),
    useSensor(TouchSensor,   { activationConstraint:{ delay:250, tolerance:6 } }),
  )

  const handleTypeSelect = (type) => {
    setSelectedType(type)
    setBoard(initBoard(type.items))
    setTitle(`Ma Tier List ${type.icon} ${type.label}`)
    setFavorites([])
    setSearch('')
    setGenre('Tous')
  }

  const findContainer = useCallback((id) => {
    if (!board) return null
    for (const [k, ids] of Object.entries(board)) if (ids.includes(id)) return k
    return null
  }, [board])

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || !board) return
    const dest = over.id
    const isContainer = [...TIERS.map(t=>t.id),'pool'].includes(dest)
    if (!isContainer) return
    const src = findContainer(active.id)
    if (!src || src===dest) return
    setBoard(prev => {
      const next = {}
      for (const k of Object.keys(prev))
        next[k] = k===src ? prev[k].filter(id=>id!==active.id)
          : k===dest ? [...prev[k], active.id] : [...prev[k]]
      return next
    })
    if (dest==='s') fireSTierConfetti()
  }

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ board, favorites, title, typeId: selectedType?.id })); setToast('✅ Sauvegardé !') }
    catch { setToast('❌ Erreur') }
  }

  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')
      if (s?.board && s?.typeId) {
        const type = TIER_TYPES.find(t=>t.id===s.typeId)
        if (type) { setSelectedType(type); setBoard(s.board); setFavorites(s.favorites||[]); setTitle(s.title||title) }
      }
      setToast('📂 Chargé !')
    } catch { setToast('❌ Aucune sauvegarde') }
  }

  const reset = () => { if (selectedType) { setBoard(initBoard(selectedType.items)); setFavorites([]); setToast('🔄 Reset !') } }

  const randomize = () => {
    if (!selectedType) return
    const all = [...selectedType.items.map(a=>a.id)].sort(()=>Math.random()-.5)
    const sizes = [2,3,4,5,5,4,3,2]
    const newB = {}; let i=0
    TIERS.forEach((t,j) => { newB[t.id]=all.slice(i,i+sizes[j]); i+=sizes[j] })
    newB.pool=all.slice(i)
    setBoard(newB); setToast('🎲 Randomisé !')
  }

  const exportPng = async () => {
    if (!boardRef.current) return
    setToast('⏳ Export…')
    try {
      const url = await toPng(boardRef.current, { backgroundColor:'#080810', pixelRatio:2 })
      const a = document.createElement('a'); a.download=`tierlist.png`; a.href=url; a.click()
      setToast('🖼️ PNG exporté !')
    } catch { setToast('❌ Export échoué') }
  }

  const BG = {
    position:'fixed', inset:0, zIndex:0,
    background:'radial-gradient(ellipse 120% 80% at 20% 0%,rgba(201,31,46,.06) 0%,transparent 50%),radial-gradient(ellipse 100% 70% at 80% 100%,rgba(64,196,255,.05) 0%,transparent 50%),#080810',
  }

  return (
    <div style={{ position:'relative', minHeight:'100vh', fontFamily:"'Inter',system-ui,sans-serif", color:'#fff' }}>
      <div style={BG}/>
      <ParticleCanvas/>

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', minHeight:'100vh', paddingTop:72 }}>
        <AnimatePresence mode="wait">
          {!selectedType ? (
            <TypeSelector key="select" onSelect={handleTypeSelect}/>
          ) : (
            <motion.div key="tierlist" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              transition={{ duration:.35 }} style={{ display:'flex', flexDirection:'column', flex:1 }}>

              {/* Toolbar */}
              <header style={{
                position:'sticky', top:72, zIndex:50,
                background:'rgba(8,8,16,.84)', backdropFilter:'blur(24px)',
                borderBottom:'1px solid rgba(255,255,255,.07)',
                padding:'0 16px', display:'flex', alignItems:'center', gap:10, height:54, flexWrap:'wrap',
              }}>
                {/* Back */}
                <motion.button whileHover={{scale:1.06}} whileTap={{scale:.96}}
                  onClick={()=>setSelectedType(null)}
                  style={{ display:'flex',alignItems:'center',gap:5,background:'rgba(255,255,255,.06)',
                    border:'1px solid rgba(255,255,255,.10)',borderRadius:8,padding:'5px 10px',
                    color:'rgba(255,255,255,.6)',fontSize:11,fontWeight:700,cursor:'pointer' }}>
                  <ArrowLeft size={12}/> Changer
                </motion.button>

                {/* Type badge */}
                <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:100,
                  background:`${selectedType.color}15`, border:`1px solid ${selectedType.color}30`,
                  fontSize:11,fontWeight:700, color:selectedType.color, flexShrink:0 }}>
                  {selectedType.icon} {selectedType.label}
                </div>

                {/* Title */}
                <div style={{ flex:1, minWidth:120, display:'flex', alignItems:'center', gap:6 }}>
                  {editTitle ? (
                    <>
                      <input ref={titleRef} value={tmpTitle} onChange={e=>setTmpTitle(e.target.value)}
                        onKeyDown={e=>{ if(e.key==='Enter'){setTitle(tmpTitle);setEditTitle(false)} if(e.key==='Escape') setEditTitle(false) }}
                        style={{ background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',
                          borderRadius:8,padding:'4px 10px',color:'#fff',fontSize:14,fontWeight:700,outline:'none',maxWidth:280 }}/>
                      <button onClick={()=>{setTitle(tmpTitle);setEditTitle(false)}} style={{ background:'#22c55e22',border:'1px solid #22c55e44',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'#22c55e' }}><Check size={12}/></button>
                      <button onClick={()=>setEditTitle(false)} style={{ background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'rgba(255,255,255,.4)' }}><X size={12}/></button>
                    </>
                  ) : (
                    <button onClick={()=>{setTmpTitle(title);setEditTitle(true);setTimeout(()=>titleRef.current?.focus(),40)}}
                      style={{ display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',
                        color:'#fff',fontSize:14,fontWeight:800,padding:0 }}>
                      {title} <Edit3 size={11} style={{ color:'rgba(255,255,255,.3)' }}/>
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:6 }}>
                  {[
                    {icon:<Save size={12}/>,    label:'Sauver',   action:save,     col:'#22c55e'},
                    {icon:<Upload size={12}/>,  label:'Charger',  action:load,     col:'#60a5fa'},
                    {icon:<Download size={12}/>,label:'PNG',      action:exportPng,col:'#FFD700'},
                    {icon:<Shuffle size={12}/>, label:'Random',   action:randomize,col:'#CE93D8'},
                    {icon:<RotateCcw size={12}/>,label:'Reset',   action:reset,    col:'#FF5252'},
                  ].map(b => (
                    <motion.button key={b.label} onClick={b.action} whileHover={{scale:1.07,y:-1}} whileTap={{scale:.95}}
                      style={{ display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:8,
                        background:`${b.col}15`,border:`1px solid ${b.col}28`,color:b.col,
                        fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap' }}>
                      {b.icon}
                      <span style={{ display: window.innerWidth < 700 ? 'none' : 'inline' }}>{b.label}</span>
                    </motion.button>
                  ))}
                </div>
              </header>

              {/* DnD */}
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

                {/* Tier board */}
                <div ref={boardRef} style={{ background:'rgba(8,8,16,.45)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                  {board && TIERS.map(tier => (
                    <TierRow key={tier.id} tier={tier} items={board[tier.id]||[]} allById={allById}/>
                  ))}
                </div>

                {/* Pool */}
                {board && (
                  <ItemPool items={board.pool||[]} allById={allById}
                    favorites={favorites} onToggleFav={id=>setFavorites(p=>p.includes(id)?p.filter(f=>f!==id):[...p,id])}
                    search={search} onSearch={setSearch} genre={genre} onGenre={setGenre}
                    currentType={selectedType}/>
                )}

                <DragOverlay>
                  {activeId ? <ItemCard itemId={activeId} allById={allById} isDragOverlay/> : null}
                </DragOverlay>
              </DndContext>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && <Toast key={toast} msg={toast} onDone={()=>setToast(null)}/>}
        </AnimatePresence>
      </div>
    </div>
  )
}
