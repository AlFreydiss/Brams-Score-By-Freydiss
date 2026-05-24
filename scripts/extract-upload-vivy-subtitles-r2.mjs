/**
 * Vivy — Extraction sous-titres FR (stream 5 ASS → VTT) + upload R2
 * Source: F:\Brams-Score-By-Freydiss-new\public\anime\[sekkusu&ok] Vivy ...\
 * R2 dest: anime/vivy-subtitles-fr/Ep01.fr.vtt … Ep13.fr.vtt
 * Met à jour src/data/vivy-videos.json avec les entrées subtitles.
 */

import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envCandidates = [
  path.join(root, '.env'),
  path.join(root, '.env.local'),
  'F:\\Brams-Score-By-Freydiss\\brams-website\\.env',
]

function loadEnv() {
  const env = { ...process.env }
  for (const p of envCandidates) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}

const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev' } = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
  throw new Error('Missing R2 env vars')

const SOURCE_DIR  = 'F:\\Brams-Score-By-Freydiss-new\\public\\anime\\[sekkusu&ok] Vivy -Fluorite Eye\'s Song- - [Multi-Subs + VOSTFR] [1080p]'
const KEY_PREFIX  = 'anime/vivy-subtitles-fr'
const TEMP        = path.join(os.tmpdir(), 'brams-vivy-subs')

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-400)}`)))
  })
}

async function exists(key) {
  try { await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true }
  catch { return false }
}

async function upload(localPath, key) {
  const size = fs.statSync(localPath).size
  const up = new Upload({
    client,
    params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(localPath), ContentType: 'text/vtt' },
    queueSize: 2, partSize: 5 * 1024 * 1024,
  })
  let last = -1
  up.on('httpUploadProgress', p => {
    const pct = Math.min(100, Math.round((p.loaded / size) * 100))
    if (pct !== last) { process.stdout.write(`\r  → ${key}: ${pct}%  `); last = pct }
  })
  await up.done()
  console.log()
}

async function main() {
  fs.mkdirSync(TEMP, { recursive: true })

  if (!fs.existsSync(SOURCE_DIR))
    throw new Error(`Source introuvable : ${SOURCE_DIR}`)

  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.toLowerCase().endsWith('.mkv'))
    .sort()

  console.log(`\n=== Vivy — Extraction sous-titres FR (${files.length} épisodes) ===\n`)

  for (const filename of files) {
    const m = filename.match(/- (\d+) \[/)
    if (!m) continue
    const ep  = parseInt(m[1], 10)
    const pad = String(ep).padStart(2, '0')
    const srcPath = path.join(SOURCE_DIR, filename)
    const key     = `${KEY_PREFIX}/Ep${pad}.fr.vtt`
    const tmpVtt  = path.join(TEMP, `Ep${pad}.fr.vtt`)

    console.log(`[Ep${pad}] ${filename}`)

    if (await exists(key)) {
      console.log('  Déjà sur R2, skip.')
      continue
    }

    console.log('  Extraction ASS → VTT (stream FR, index 3)...')
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', srcPath,
      '-map', '0:s:3',   // stream 5 = 4ème piste subtitle = Français
      tmpVtt,
    ])

    const kb = (fs.statSync(tmpVtt).size / 1024).toFixed(0)
    console.log(`  Taille: ${kb} KB`)
    await upload(tmpVtt, key)
    fs.unlinkSync(tmpVtt)
    console.log(`  ✓ Ep${pad} terminé`)
  }

  // Mise à jour vivy-videos.json
  const jsonPath = path.join(root, 'src', 'data', 'vivy-videos.json')
  const videos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

  const updated = videos.map(v => {
    const pad = String(v.episode).padStart(2, '0')
    return {
      ...v,
      subtitles: [
        { label: 'Français', srclang: 'fr', src: `${R2_PUBLIC_URL}/${KEY_PREFIX}/Ep${pad}.fr.vtt` },
      ],
    }
  })

  fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), 'utf8')
  console.log(`\n✓ ${jsonPath} mis à jour (sous-titres FR pour les 13 épisodes)`)
  console.log('=== DONE ===')
}

main().catch(err => { console.error(err); process.exit(1) })
