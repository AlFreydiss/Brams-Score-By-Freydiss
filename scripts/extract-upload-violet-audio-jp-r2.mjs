/**
 * Violet Evergarden — Extraction audio JP depuis video-jp/EpNNN.mp4 → m4a + upload R2
 * Source: F:\Brams-Score-By-Freydiss-new\public\Violet Evergarden\video-jp\Ep001.mp4 … Ep013.mp4
 * Destination R2: anime/violet-evergarden-audio-jp/Ep001.m4a … Ep013.m4a
 * Met à jour src/data/violet-evergarden-videos.json avec l'entrée VOSTFR.
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

const VIDEO_JP_DIR = 'F:\\Brams-Score-By-Freydiss-new\\public\\Violet Evergarden\\video-jp'
const KEY_PREFIX   = 'anime/violet-evergarden-audio-jp'
const TEMP         = path.join(os.tmpdir(), 'brams-violet-jp')

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { process.stderr.write(chunk); stderr += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-500)}`)))
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
    params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(localPath), ContentType: 'audio/mp4' },
    queueSize: 4, partSize: 10 * 1024 * 1024,
  })
  let last = -1
  up.on('httpUploadProgress', p => {
    const pct = Math.min(100, Math.round((p.loaded / size) * 100))
    if (pct !== last) { process.stdout.write(`\r  Upload ${key}: ${pct}%  `); last = pct }
  })
  await up.done()
  console.log()
}

async function main() {
  fs.mkdirSync(TEMP, { recursive: true })
  console.log('\n=== Violet Evergarden — Extraction audio JP (Ep01-13) ===\n')

  if (!fs.existsSync(VIDEO_JP_DIR)) {
    throw new Error(`Source introuvable : ${VIDEO_JP_DIR}`)
  }

  const files = fs.readdirSync(VIDEO_JP_DIR)
    .filter(f => /Ep\d+\.mp4$/i.test(f))
    .sort()

  console.log(`${files.length} fichiers source trouvés\n`)

  for (const filename of files) {
    const m = filename.match(/Ep(\d+)\.mp4$/i)
    if (!m) continue
    const pad    = m[1].padStart(3, '0')
    const srcPath = path.join(VIDEO_JP_DIR, filename)
    const key    = `${KEY_PREFIX}/Ep${pad}.m4a`
    const tmpM4a = path.join(TEMP, `Ep${pad}.m4a`)

    console.log(`[Ep${pad}] ${filename}`)

    if (await exists(key)) {
      console.log('  Déjà sur R2, skip.')
      continue
    }

    console.log('  Extraction audio JP (stream copy)...')
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', srcPath,
      '-map', '0:a:0',
      '-c:a', 'copy',
      tmpM4a,
    ])

    const mb = (fs.statSync(tmpM4a).size / 1e6).toFixed(1)
    console.log(`  Taille: ${mb} MB`)
    await upload(tmpM4a, key)
    fs.unlinkSync(tmpM4a)
    console.log(`  ✓ Ep${pad} terminé`)
  }

  // ── Mise à jour violet-evergarden-videos.json
  const jsonPath = path.join(root, 'src', 'data', 'violet-evergarden-videos.json')
  const videos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

  const updated = videos.map(v => {
    const pad = String(v.episode).padStart(3, '0')
    const jpSrc = `${R2_PUBLIC_URL}/${KEY_PREFIX}/Ep${pad}.m4a`
    const frSrc = `${R2_PUBLIC_URL}/anime/violet-evergarden-audio-fr/Ep${pad}.m4a`
    return {
      ...v,
      audio: [
        { label: 'VOSTFR', srclang: 'ja', src: jpSrc },
        { label: 'VF',     srclang: 'fr', src: frSrc },
      ],
    }
  })

  fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), 'utf8')
  console.log(`\n✓ ${jsonPath} mis à jour (VOSTFR + VF pour les 13 épisodes)`)
  console.log('=== DONE ===')
}

main().catch(err => { console.error(err); process.exit(1) })
