#!/usr/bin/env node
/**
 * sync-chapters.js — Récupère les métadonnées des chapitres One Piece
 * depuis l'API publique MangaDex et sauvegarde dans public/data/chapters.json.
 *
 * Usage : node scripts/sync-chapters.js
 * Cron  : lancé automatiquement par GitHub Actions chaque semaine
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT    = join(__dirname, '../brams-website/public/data/chapters.json')

// ID One Piece sur MangaDex
const MANGA_ID  = 'a1c7c817-4e59-43b7-9365-09675a149a6f'
const BASE      = 'https://api.mangadex.org'
const DELAY_MS  = 400   // pause entre requêtes pour respecter le rate-limit

const ARCS = [
  { name: 'Wano',    range: [909,  1057] },
  { name: 'Egghead', range: [1058, 1125] },
  { name: 'Elbaf',   range: [1126, 9999], current: true },
]

function getArc(num) {
  return ARCS.find(a => num >= a.range[0] && num <= a.range[1])?.name ?? 'Autre'
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function apiFetch(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BramsScoreBot/1.0 (github.com/Freydiss)' },
    signal: AbortSignal.timeout(15_000),
  })
  if (res.status === 429) {
    console.warn('  ⚠ Rate limited, attente 10s…')
    await sleep(10_000)
    return apiFetch(url)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

// Récupère tous les chapitres d'une langue donnée (paginé par 100)
async function fetchByLang(lang) {
  const results = []
  let offset = 0
  const limit = 100

  while (true) {
    const params = new URLSearchParams({
      limit,
      offset,
      'translatedLanguage[]': lang,
      'order[chapter]': 'asc',
      'contentRating[]': ['safe', 'suggestive'],
      includeExternalUrl: 1,
    })
    const url = `${BASE}/manga/${MANGA_ID}/feed?${params}`

    console.log(`  Fetching ${lang} offset=${offset}…`)
    const data = await apiFetch(url)
    if (!data.data?.length) break

    for (const ch of data.data) {
      const a   = ch.attributes
      const num = parseFloat(a.chapter)
      if (isNaN(num) || !Number.isInteger(num)) continue  // ignore demi-chapitres

      results.push({
        id:     ch.id,
        num,
        title:  a.title?.trim() || null,
        date:   a.publishAt?.slice(0, 10) ?? null,
        readUrl: a.externalUrl || `https://mangadex.org/chapter/${ch.id}`,
        lang,
      })
    }

    offset += limit
    if (offset >= data.total) break
    await sleep(DELAY_MS)
  }

  return results
}

async function main() {
  console.log('🔄 Sync chapitres One Piece — MangaDex API')

  // Récupère EN + FR
  const [enChs, frChs] = await Promise.all([
    fetchByLang('en'),
    fetchByLang('fr'),
  ])

  // Index FR par numéro pour merge rapide
  const frByNum = new Map()
  for (const ch of frChs) {
    if (!frByNum.has(ch.num)) frByNum.set(ch.num, ch)
  }

  // Merge : EN comme base, FR pour le titre si dispo
  const byNum = new Map()
  for (const ch of enChs) {
    const fr = frByNum.get(ch.num)
    byNum.set(ch.num, {
      num:       ch.num,
      chapterId: ch.id,          // UUID MangaDex → MangaDex @ Home API
      titleFr:   fr?.title ?? null,
      titleEn:   ch.title  ?? null,
      date:      ch.date   ?? fr?.date ?? null,
      arc:       getArc(ch.num),
    })
  }
  // Chapitres FR sans version EN
  for (const ch of frChs) {
    if (!byNum.has(ch.num)) {
      byNum.set(ch.num, {
        num:       ch.num,
        chapterId: ch.id,
        titleFr:   ch.title ?? null,
        titleEn:   null,
        date:      ch.date  ?? null,
        arc:       getArc(ch.num),
      })
    }
  }

  const chapters = [...byNum.values()].sort((a, b) => a.num - b.num)

  // Sauvegarde (préserve les données existantes si aucun nouveau chapitre)
  let existing = []
  if (existsSync(OUTPUT)) {
    try { existing = JSON.parse(readFileSync(OUTPUT, 'utf8')) } catch {}
  }

  if (existing.length === chapters.length &&
      existing[existing.length - 1]?.num === chapters[chapters.length - 1]?.num) {
    console.log(`✅ Aucun nouveau chapitre (${chapters.length} total). Fichier inchangé.`)
    return
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(chapters, null, 2), 'utf8')
  console.log(`✅ ${chapters.length} chapitres sauvegardés → ${OUTPUT}`)
  console.log(`   Dernier : Ch.${chapters[chapters.length - 1]?.num} (${chapters[chapters.length - 1]?.arc})`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
