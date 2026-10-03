#!/usr/bin/env node
// Guess Who : Bankai calés par reconnaissance vocale (faster-whisper, « 卍解 »
// transcrit « 万回 » + nom du Bankai juste après). Remplace le découpage aux
// pics de volume, qui tombait souvent sur de la musique.
//   node scripts/guesswho-bankai-named.mjs <dossier contenant src.wav>
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const p of [join(ROOT, '.env.local'), join(ROOT, '.env')]) {
  try {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
}
const DIR = process.argv[2]
const PUBLIC = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
const s3 = new S3Client({
  region: 'auto', endpoint: `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
})

// [id, début (s), durée (s), titre affiché, personnage]
const CLIPS = [
  ['byakuya', 17.5, 4.3, 'Bankai ! Senbonzakura Kageyoshi', 'Byakuya'],
  ['gin', 72.7, 4.3, 'Bankai ! Kamishini no Yari', 'Gin'],
  ['ichigo', 110.6, 3.2, 'Bankai ! Tensa Zangetsu', 'Ichigo'],
  ['mayuri', 312.6, 4.9, 'Bankai ! Konjiki Ashisogi Jizō', 'Mayuri'],
  // on entend « Ikuze, Zabimaru », pas l'annonce du Bankai (transcrit le 2026-10-03)
  ['renji', 333.3, 4.0, 'Ikuze, Zabimaru !', 'Renji'],
  // à 390,7 s c'est Rukia (« Hakka no Togame »), pas Komamura (transcrit le 2026-10-03)
  ['rukia', 390.7, 6.0, 'Bankai ! Hakka no Togame', 'Rukia'],
  ['hirako', 473.1, 5.5, 'Bankai ! Sakashima Yokoshima Happō Fusagari', 'Hirako'],
  ['shunsui', 580.4, 3.0, 'Bankai ! Katen Kyōkotsu', 'Shunsui'],
  ['unohana', 669.0, 3.6, 'Bankai ! Minazuki', 'Unohana'],
  ['urahara', 702.1, 5.3, 'Bankai ! Kannonbiraki Benihime Aratame', 'Urahara'],
  ['yamamoto', 763.2, 3.7, 'Bankai ! Zanka no Tachi', 'Yamamoto'],
]

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const sql = ["delete from guesswho_clips where id like 'bleach-bankai-yt-%';"]
for (const [name, start, dur, title, who] of CLIPS) {
  const id = `bleach-bankai-${name}`
  const file = join(DIR, `${id}.mp3`)
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(start), '-t', String(dur), '-i', join(DIR, 'src.wav'),
    '-vn', '-ac', '1', '-ar', '44100', '-af', `afade=t=in:d=0.04,afade=t=out:st=${(dur - 0.2).toFixed(2)}:d=0.2,loudnorm=I=-16:TP=-1.5`,
    '-c:a', 'libmp3lame', '-b:a', '96k', file])
  if (r.status !== 0) { console.log(`✗ ${id}: ${r.stderr}`); continue }
  await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: `guesswho/clips/${id}.mp3`, Body: readFileSync(file), ContentType: 'audio/mpeg' }))
  sql.push(`insert into guesswho_clips(id, title, anime, lang, kind, url, duration, enabled) values (${q(id)}, ${q(title)}, ${q(`Bleach (${who})`)}, 'ja', 'technique', ${q(`${PUBLIC}/guesswho/clips/${id}.mp3`)}, ${dur}, true) on conflict (id) do update set title = excluded.title, anime = excluded.anime, url = excluded.url, duration = excluded.duration, enabled = true;`)
  console.log(`✓ ${id}`)
}
writeFileSync(join(DIR, 'bankai-named.sql'), sql.join('\n') + '\n')
console.log(`SQL → ${join(DIR, 'bankai-named.sql')}`)
