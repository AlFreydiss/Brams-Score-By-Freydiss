#!/usr/bin/env node
// Guess Who : répliques cultes tirées de voice packs TikTok (@shadowcast_1).
// Entrée : picks.json (liste ci-dessous) + dossier des pistes wav téléchargées
// (yt-dlp -x --audio-format wav), calées par faster-whisper.
// Sortie : mp3 sur R2 (guesswho/clips/vp-<id>.mp3, sauté s'il existe déjà) et
// choix.html : page d'écoute avec cases à cocher qui génère le SQL à coller.
//
//   node scripts/guesswho-voicepacks.mjs <picks.json> <dossier wav> [--env <fichier .env>] [--dry]
//
// picks.json : [{ id, vid, start, end, title, who, anime, lang, pre }]
//   title = réplique affichée, who = personnage, pre = coché par défaut.
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const [PICKS, DIR] = argv
const DRY = argv.includes('--dry')
const envFiles = [join(ROOT, '.env.local'), join(ROOT, '.env')]
if (argv.includes('--env')) envFiles.unshift(argv[argv.indexOf('--env') + 1])
const env = {}
for (const p of envFiles) {
  try {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
}
const PUBLIC = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
const s3 = new S3Client({
  region: 'auto', endpoint: `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
})
async function exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key })); return true } catch { return false }
}

const picks = JSON.parse(readFileSync(PICKS, 'utf8'))
const OUT = join(DIR, 'mp3')
mkdirSync(OUT, { recursive: true })
const rows = []
for (const p of picks) {
  const id = `vp-${p.id}`
  // 0,12 s d'avance et 0,3 s de traîne : whisper coupe souvent l'attaque et la fin
  const start = Math.max(0, p.start - 0.12)
  const dur = +(p.end - start + 0.3).toFixed(2)
  const file = join(OUT, `${id}.mp3`)
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(start), '-t', String(dur), '-i', join(DIR, `${p.vid}.wav`),
    '-vn', '-ac', '1', '-ar', '44100', '-af', `afade=t=in:d=0.03,afade=t=out:st=${(dur - 0.18).toFixed(2)}:d=0.18,loudnorm=I=-16:TP=-1.5`,
    '-c:a', 'libmp3lame', '-b:a', '96k', file])
  if (r.status !== 0) { console.log(`✗ ${id}: ${r.stderr}`); continue }
  const key = `guesswho/clips/${id}.mp3`
  if (!DRY && !(await exists(key))) {
    await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: readFileSync(file), ContentType: 'audio/mpeg' }))
  }
  rows.push({ ...p, id, dur, url: `${PUBLIC}/${key}` })
  console.log(`✓ ${id}`)
}

const migration = readFileSync(join(ROOT, 'supabase/migrations/20261008_guess_who_repliques.sql'), 'utf8')
const html = readFileSync(join(ROOT, 'scripts/guesswho/choix-template.html'), 'utf8')
  .replace('/*__CLIPS__*/[]', () => JSON.stringify(rows))
  .replace('/*__MIGRATION__*/""', () => JSON.stringify(migration))  // fonction : sinon « $$ » devient « $ »
writeFileSync(join(DIR, 'choix.html'), html)
console.log(`${rows.length} répliques → ${join(DIR, 'choix.html')}`)
