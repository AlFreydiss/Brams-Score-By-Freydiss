#!/usr/bin/env node
// Garde-fou egress : AUCUN media ne doit etre servi depuis Supabase Storage.
// Le quota egress du plan Free (5 Go/mois) a deja ete crame deux fois par des
// images de scans servies depuis le bucket `scans`. Tout media lourd va sur
// Cloudflare R2 (egress gratuit). Ce script tourne en `prebuild` : si une URL
// Supabase Storage ou un appel `supabase.storage.from(...)` reapparait dans le
// code ou les donnees, le build echoue avant d'atteindre la prod.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative, extname, dirname } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// `scripts` est scanne aussi : c'est de la que venaient les URLs. Un garde-fou
// qui bloque le resultat tout en laissant le script qui le produit n'en est
// qu'un a moitie.
const SCAN_DIRS = ['src', 'api', 'public', 'server', 'scripts']
const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.html', '.css'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vercel'])

// Fichiers autorises a mentionner Supabase Storage (commentaire de doc, aucune URL servie).
const ALLOW_FILES = [
  'src/components/devil-fruit/character-data.js',
  // Ce fichier-ci porte les motifs recherches : il se detecterait lui-meme.
  'scripts/check-no-supabase-storage.mjs',
]

const PATTERNS = [
  { re: /\/storage\/v1\/object\//, why: 'URL Supabase Storage' },
  { re: /\.storage\s*\.\s*from\s*\(/, why: 'appel .storage.from()' },
]

function walk(dir, out = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) walk(full, out)
    else if (EXTS.has(extname(name))) out.push(full)
  }
  return out
}

const hits = []
for (const d of SCAN_DIRS) {
  for (const file of walk(join(ROOT, d))) {
    const rel = relative(ROOT, file).split('\\').join('/')
    if (ALLOW_FILES.includes(rel)) continue
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      for (const p of PATTERNS) {
        if (p.re.test(line)) hits.push({ rel, line: i + 1, why: p.why, text: line.trim().slice(0, 120) })
      }
    })
  }
}

if (hits.length) {
  console.error('\n\x1b[31m[X] Supabase Storage detecte - build bloque.\x1b[0m')
  console.error("  Le quota egress Free (5 Go/mois) saute des qu'on sert des medias depuis Supabase.")
  console.error('  Tout media va sur Cloudflare R2 (egress gratuit) : /api/r2-presign ou src/lib/r2Upload.js.\n')
  const shown = hits.slice(0, 25)
  for (const h of shown) console.error(`  ${h.rel}:${h.line}  ${h.why}\n    ${h.text}`)
  if (hits.length > shown.length) console.error(`  ... et ${hits.length - shown.length} autres.`)
  console.error('')
  process.exit(1)
}

console.log('[OK] Aucun media Supabase Storage - egress safe.')
