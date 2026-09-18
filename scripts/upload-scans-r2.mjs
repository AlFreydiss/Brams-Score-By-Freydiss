#!/usr/bin/env node
// ── Upload d'une série de scans vers Cloudflare R2 ────────────────────────────
//
// Générique : marche pour n'importe quel dossier « Chapitre N / 01.jpg ». Écrit
// pour remettre en ligne les séries dont les images vivaient sur Supabase
// Storage — le bucket a été vidé et leurs URLs répondent 400 (DBS et Nanatsu no
// Taizai). L'egress du plan Free a déjà été cramé deux fois : tout média lourd
// va sur R2 (egress gratuit), jamais sur Supabase Storage.
//
//   node scripts/upload-scans-r2.mjs --dir "C:/.../Boruto Two Blue Vortex" --slug boruto
//   node scripts/upload-scans-r2.mjs --dir "..." --slug boruto --dry
//   node scripts/upload-scans-r2.mjs --dir "..." --slug boruto --only 1,2,3
//
// Reprise : les objets déjà présents sur R2 avec la même taille sont sautés, on
// peut donc relancer après une coupure sans tout re-téléverser.

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// ── env ──
function loadEnv() {
  const env = {}
  for (const p of [join(ROOT, '.env.local'), join(ROOT, '.env')]) {
    try {
      for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^([^#=]+)=(.*)$/)
        if (m) env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '')
      }
    } catch {}
  }
  return { ...env, ...process.env }
}
const env = loadEnv()
const {
  CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev',
} = env

// ── args ──
const argv = process.argv.slice(2)
const arg = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const flag = n => argv.includes('--' + n)
const DIR = arg('dir')
const SLUG = arg('slug')
const DRY = flag('dry')
const CONC = Number(arg('conc', 8))
const ONLY = arg('only') ? new Set(arg('only').split(',').map(s => s.trim())) : null

if (!DIR || !SLUG) {
  console.error('usage: --dir "<dossier>" --slug <slug> [--dry] [--only 1,2] [--conc 8]')
  process.exit(1)
}
if (!DRY && !(CF_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME)) {
  console.error('credentials R2 manquants (CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)')
  process.exit(1)
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' }
const isImage = f => MIME[extname(f).toLowerCase()] !== undefined

// Tri naturel : « Chapitre 2 » avant « Chapitre 10 », « 2.jpg » avant « 10.jpg ».
const natural = (a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' })

// Le numéro est le premier entier du nom : encaisse « Chapitre 32 (VUS) ».
function chapterNum(name) {
  const m = name.match(/(\d+(?:[.,]\d+)?)/)
  return m ? m[1].replace(',', '.') : null
}

const client = DRY ? null : new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

async function alreadyThere(key, size) {
  try {
    const h = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    return h.ContentLength === size
  } catch { return false }
}

async function put(key, body, type) {
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME, Key: key, Body: body, ContentType: type,
    // Les pages de scans ne changent jamais une fois publiees.
    CacheControl: 'public, max-age=31536000, immutable',
  }))
}

// ── collecte ──
const chapters = readdirSync(DIR)
  .filter(d => { try { return statSync(join(DIR, d)).isDirectory() } catch { return false } })
  .map(d => ({ dir: d, num: chapterNum(d) }))
  .filter(c => c.num !== null)
  .sort((a, b) => Number(a.num) - Number(b.num))

if (!chapters.length) { console.error('aucun dossier de chapitre trouve dans', DIR); process.exit(1) }

const plan = []
for (const ch of chapters) {
  if (ONLY && !ONLY.has(ch.num)) continue
  const files = readdirSync(join(DIR, ch.dir)).filter(isImage).sort(natural)
  if (!files.length) { console.warn(`  ! chapitre ${ch.num} : aucune image, ignore`); continue }
  plan.push({ ...ch, files })
}

const totalFiles = plan.reduce((n, c) => n + c.files.length, 0)
const totalBytes = plan.reduce((n, c) => n + c.files.reduce((m, f) => m + statSync(join(DIR, c.dir, f)).size, 0), 0)
console.log(`${plan.length} chapitres · ${totalFiles} images · ${(totalBytes / 1048576).toFixed(0)} Mo`)
console.log(`cible : ${R2_PUBLIC_URL}/scans/${SLUG}/chXX/NN.ext`)
if (DRY) {
  for (const c of plan.slice(0, 3)) {
    console.log(`  ch${c.num} (${c.files.length} pages) : ${c.files[0]} -> scans/${SLUG}/ch${c.num}/${c.files[0]}`)
  }
  if (plan.length > 3) console.log(`  … et ${plan.length - 3} autres chapitres`)
  console.log('\n--dry : rien n\'a ete envoye.')
}

// ── upload ──
const out = []
let done = 0, skipped = 0, failed = 0

async function pool(items, worker) {
  const it = items[Symbol.iterator]()
  await Promise.all(Array.from({ length: Math.min(CONC, items.length) }, async () => {
    for (const item of it) await worker(item)
  }))
}

for (const ch of plan) {
  const pages = new Array(ch.files.length)
  if (!DRY) {
    await pool(ch.files.map((f, i) => ({ f, i })), async ({ f, i }) => {
      const key = `scans/${SLUG}/ch${ch.num}/${f}`
      const full = join(DIR, ch.dir, f)
      const size = statSync(full).size
      try {
        if (await alreadyThere(key, size)) skipped++
        else { await put(key, readFileSync(full), MIME[extname(f).toLowerCase()]); done++ }
      } catch (e) {
        failed++
        console.error(`  x ch${ch.num}/${f} : ${e.message}`)
      }
      pages[i] = `${R2_PUBLIC_URL}/${key}`
      const n = done + skipped + failed
      if (n % 50 === 0) process.stdout.write(`\r  ${n}/${totalFiles}…`)
    })
  } else {
    ch.files.forEach((f, i) => { pages[i] = `${R2_PUBLIC_URL}/scans/${SLUG}/ch${ch.num}/${f}` })
  }
  // Pas de titre invente : le lecteur affiche le nombre de pages a la place.
  out.push({ num: Number(ch.num), title: '', pages })
}

// Le lecteur generique MangaReaderPage charge src/data/manga/<slug>.json via
// import.meta.glob. C'est le chemin vivant ; les src/data/<slug>-chapters.json
// sont l'ancien format (URLs Supabase mortes).
const dest = join(ROOT, 'src', 'data', 'manga', `${SLUG}.json`)
if (!DRY) {
  writeFileSync(dest, JSON.stringify(out, null, 2) + '\n')
  console.log(`\n\nenvoyes ${done} · deja presents ${skipped} · echecs ${failed}`)
  console.log(`ecrit ${dest.replace(ROOT, '.')} (${out.length} chapitres)`)
  if (failed) { console.error('\nDes images ont echoue : relance la meme commande, les reussites sont sautees.'); process.exit(1) }
} else {
  console.log(`\nECRIRAIT ${dest.replace(ROOT, '.')} (${out.length} chapitres)`)
}
