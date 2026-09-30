#!/usr/bin/env node
// Genere src/data/scans-catalog.js a partir des src/data/manga/<slug>.json.
//
// Le hub « Animes & Scans » a besoin de lister les scans sans importer les JSON
// eux-memes : kingdom.json pese 1,3 Mo a lui seul, les embarquer dans le bundle
// du hub pour n'en lire que la longueur serait absurde. Ce catalogue ne garde
// que le strict necessaire a une carte.
//
//   node scripts/gen-scans-catalog.mjs
//
// A relancer apres chaque ajout de serie (upload-scans-r2.mjs).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANGA_DIR = join(ROOT, 'src', 'data', 'manga')

// Titre et couleur : MANGA_REGISTRY dans App.jsx est la source de verite du
// lecteur, on la relit plutot que de la dupliquer.
const app = readFileSync(join(ROOT, 'src', 'App.jsx'), 'utf8')
const reg = {}
const block = app.slice(app.indexOf('const MANGA_REGISTRY = {'))
for (const m of block.slice(0, block.indexOf('\n}')).matchAll(
  // Titres et couleurs acceptent les deux styles de guillemets : « L'Attaque
  // des Titans » est ecrit en doubles a cause de son apostrophe.
  /^\s*'?([a-z0-9-]+)'?:\s*\{\s*title:\s*(['"])(.+?)\2,\s*color:\s*(['"])(.+?)\4/gm
)) reg[m[1]] = { title: m[3], color: m[5] }

// Quand un scan a aussi un anime au catalogue, on reutilise son affiche plutot
// que d'en inventer une : meme visuel dans les deux rangees du hub.
const ANIME_ID = {
  aot: 'aot', 'black-clover': 'bc', 'blue-lock': 'bluelock', 'dr-stone': 'drstone',
  'fire-force': 'fireforce', jjk: 'jjk', kingdom: 'kingdom', kny: 'kny',
  mha: 'mha', 'solo-leveling': 'sl', nnt: 'nnt', dbs: 'dbs', tpn: 'tpn',
}

// Fiche de chaque manga (AniList, verifiee a la main pour les auteurs) et
// couverture officielle WebP 460 px hebergee sur R2 (manga/covers/<slug>.webp).
// Avant, la carte prenait la premiere page du chapitre 1 : une planche en noir
// et blanc pour Dr. Stone et Boruto, ou l'affiche de l'anime pour les autres.
const COVERS = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers'
const META = {
  aot:             { author: 'Hajime Isayama',                  year: 2009, status: 'termine', score: 84, genres: ['Action', 'Drame', 'Mystère'] },
  'black-clover':  { author: 'Yūki Tabata',                     year: 2014, status: 'termine', score: 69, genres: ['Action', 'Comédie', 'Fantasy'] },
  'blue-lock':     { author: 'Muneyuki Kaneshiro · Yūsuke Nomura', year: 2018, status: 'encours', score: 82, genres: ['Sport', 'Drame'] },
  boruto:          { author: 'Masashi Kishimoto · Mikio Ikemoto', year: 2023, status: 'encours', score: 75, genres: ['Action', 'Aventure'] },
  'dr-stone':      { author: 'Riichirō Inagaki · Boichi',       year: 2017, status: 'termine', score: 81, genres: ['Aventure', 'Science-fiction'] },
  'fire-force':    { author: 'Atsushi Ōkubo',                   year: 2015, status: 'termine', score: 78, genres: ['Action', 'Surnaturel'] },
  jjk:             { author: 'Gege Akutami',                    year: 2018, status: 'termine', score: 80, genres: ['Action', 'Surnaturel'] },
  kingdom:         { author: 'Yasuhisa Hara',                   year: 2006, status: 'encours', score: 89, genres: ['Action', 'Historique'] },
  kny:             { author: 'Koyoharu Gotōge',                 year: 2016, status: 'termine', score: 79, genres: ['Action', 'Surnaturel'] },
  mha:             { author: 'Kōhei Horikoshi',                 year: 2014, status: 'termine', score: 78, genres: ['Action', 'Super-héros'] },
  'solo-leveling': { author: 'Chugong · DUBU',                  year: 2018, status: 'termine', score: 84, genres: ['Action', 'Fantasy'] },
}

const out = []
for (const f of readdirSync(MANGA_DIR).filter(f => f.endsWith('.json')).sort()) {
  const slug = basename(f, '.json')
  let data
  try { data = JSON.parse(readFileSync(join(MANGA_DIR, f), 'utf8')) } catch { continue }
  if (!Array.isArray(data) || !data.length) { console.warn(`  ! ${slug} : vide, ignore`); continue }
  const nums = data.map(c => Number(c.num)).filter(Number.isFinite)
  out.push({
    slug,
    title: reg[slug]?.title || slug,
    color: reg[slug]?.color || '#8b5cf6',
    chapters: data.length,
    first: nums.length ? Math.min(...nums) : null,
    last: nums.length ? Math.max(...nums) : null,
    // Couverture officielle si on l'a, sinon la premiere page du chapitre 1.
    cover: META[slug] ? `${COVERS}/${slug}.webp` : (data[0]?.pages?.[0] || null),
    ...(META[slug] || {}),
    animeId: ANIME_ID[slug] || null,
  })
}

const body = `// GENERE PAR scripts/gen-scans-catalog.mjs — NE PAS EDITER A LA MAIN.
// Relancer apres chaque ajout de serie. Ne contient que de quoi afficher une
// carte : les chapitres eux-memes restent dans src/data/manga/<slug>.json,
// charges a la demande par la route /manga/:slug.
export const SCANS = ${JSON.stringify(out, null, 2)}
`
writeFileSync(join(ROOT, 'src', 'data', 'scans-catalog.js'), body)
console.log(`${out.length} series · ${out.reduce((n, s) => n + s.chapters, 0)} chapitres`)
console.log(out.map(s => `  ${s.slug.padEnd(14)} ${String(s.chapters).padStart(4)} ch${s.animeId ? '' : '  (pas d anime associe)'}`).join('\n'))
