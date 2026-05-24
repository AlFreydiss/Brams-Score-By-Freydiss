/**
 * Kaiju No.8 — MKV (x264 MULTi) → MP4 remux + JP audio m4a extraction + R2 upload
 * Source: F:\...\Kaiju No 8 S01 MULTi 1080p WEB x264 AAC -Tsundere-Raws (CR)\
 * Stream copy (no re-encoding), very fast.
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

const SOURCE_DIR = 'F:\\Brams-Score-By-Freydiss\\brams-website\\public\\anime\\Kaiju No 8 S01 MULTi 1080p WEB x264 AAC -Tsundere-Raws (CR)'
const VIDEO_KEY_PREFIX  = 'anime/kaiju-no-8'
const AUDIO_JP_KEY_PREFIX = 'anime/kaiju-no-8-audio-jp'
const TEMP = path.join(os.tmpdir(), 'brams-kaiju')

const TITLES = [
  'Le monstre du siècle',
  'Le monstre n°8',
  'Le secret de Kafka Hibino',
  'Ce que je protège',
  'Kikoru Shinomiya',
  "L'exercice de déploiement",
  "L'arme de classe F",
  'La bête',
  'Combattez comme des démons',
  'Soshiro Hoshina',
  'Armement complet',
  'Kai Magnificat',
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { process.stderr.write(chunk); stderr += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)))
  })
}

async function exists(key) {
  try { await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true }
  catch { return false }
}

async function upload(localPath, key, contentType) {
  const size = fs.statSync(localPath).size
  const up = new Upload({
    client,
    params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(localPath), ContentType: contentType },
    queueSize: 4, partSize: 10 * 1024 * 1024,
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

  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.toLowerCase().endsWith('.mkv'))
    .sort()

  console.log(`\n=== Kaiju No.8 — ${files.length} épisodes ===\n`)

  const jsonData = []

  for (const filename of files) {
    const m = filename.match(/S01E(\d+)/i)
    if (!m) { console.log(`Skip (pas d'épisode): ${filename}`); continue }
    const ep = parseInt(m[1], 10)
    const pad = String(ep).padStart(2, '0')
    const srcPath = path.join(SOURCE_DIR, filename)
    const videoKey = `${VIDEO_KEY_PREFIX}/S01E${pad}.mp4`
    const audioKey = `${AUDIO_JP_KEY_PREFIX}/Ep${pad}.m4a`
    const tmpMp4 = path.join(TEMP, `S01E${pad}.mp4`)
    const tmpM4a = path.join(TEMP, `Ep${pad}.m4a`)

    console.log(`[E${pad}] ${filename}`)

    // 1. Remux MP4 (vidéo + audio FR seulement, stream copy)
    if (await exists(videoKey)) {
      console.log('  MP4 déjà sur R2, skip.')
    } else {
      console.log('  Remux MKV → MP4...')
      await run('ffmpeg', [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-i', srcPath,
        '-map', '0:v:0',
        '-map', '0:a:0',      // première piste audio = FR (default)
        '-c', 'copy',
        '-movflags', '+faststart',
        tmpMp4,
      ])
      const mb = (fs.statSync(tmpMp4).size / 1e6).toFixed(0)
      console.log(`  Upload MP4 (${mb} MB)...`)
      await upload(tmpMp4, videoKey, 'video/mp4')
      fs.unlinkSync(tmpMp4)
    }

    // 2. Extraction audio JP → m4a
    if (await exists(audioKey)) {
      console.log('  Audio JP déjà sur R2, skip.')
    } else {
      console.log('  Extraction audio JP → m4a...')
      await run('ffmpeg', [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-i', srcPath,
        '-map', '0:a:1',      // deuxième piste audio = JP (VO)
        '-c:a', 'copy',
        tmpM4a,
      ])
      const mb = (fs.statSync(tmpM4a).size / 1e6).toFixed(1)
      console.log(`  Upload m4a JP (${mb} MB)...`)
      await upload(tmpM4a, audioKey, 'audio/mp4')
      fs.unlinkSync(tmpM4a)
    }

    jsonData.push({
      episode: ep,
      title: TITLES[ep - 1] || `Episode ${ep}`,
      src: `${R2_PUBLIC_URL}/${videoKey}`,
      season: 'S01',
      arc: 'Kaiju No. 8',
      audio: [
        { label: 'VF', srclang: 'fr' },
        { label: 'VOSTFR', srclang: 'ja', src: `${R2_PUBLIC_URL}/${audioKey}` },
      ],
      subtitles: [],
    })

    console.log(`  ✓ E${pad} terminé`)
  }

  // Mise à jour du JSON
  const jsonPath = path.join(root, 'src', 'data', 'kaiju-videos.json')
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8')
  console.log(`\n✓ ${jsonPath} mis à jour (${jsonData.length} épisodes)`)
  console.log('=== DONE ===')
}

main().catch(err => { console.error(err); process.exit(1) })
