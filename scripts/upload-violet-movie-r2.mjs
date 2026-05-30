/**
 * Violet Evergarden — Le Film : upload VO (JA) + VF + sous-titres FR sur R2.
 * Source (générée via ffmpeg depuis le MKV BDRip) :
 *   F:\Brams-Score-By-Freydiss-new\public\anime\violet-evergarden\
 *     the-movie.mp4      (vidéo h264 copiée + audio JA AAC)  → VO / défaut
 *     the-movie.vf.mp4   (vidéo h264 copiée + audio VF AAC)
 *     the-movie.fr.vtt   (sous-titres "Français - Complet" ASS→VTT)
 * Destination R2 : anime/violet-evergarden/the-movie(.vf).mp4 + the-movie.fr.vtt
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envCandidates = [path.join(root, '.env'), path.join(root, '.env.local')]

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

const {
  CF_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev',
} = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars (CF_ACCOUNT_ID / R2_BUCKET_NAME / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)')
}

const SOURCE_DIR = process.env.VE_MOVIE_DIR
  || 'F:\\Brams-Score-By-Freydiss-new\\public\\anime\\violet-evergarden'
const PREFIX = 'anime/violet-evergarden'

const FILES = [
  { local: 'the-movie.mp4',    key: `${PREFIX}/the-movie.mp4`,    type: 'video/mp4' },
  { local: 'the-movie.vf.mp4', key: `${PREFIX}/the-movie.vf.mp4`, type: 'video/mp4' },
  { local: 'the-movie.fr.vtt', key: `${PREFIX}/the-movie.fr.vtt`, type: 'text/vtt; charset=utf-8' },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const fmt = b => b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`

async function sameSizeOnR2(key, size) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    return Number(head.ContentLength || 0) === size
  } catch { return false }
}

async function uploadFile({ local, key, type }) {
  const filePath = path.join(SOURCE_DIR, local)
  if (!fs.existsSync(filePath)) throw new Error(`Fichier source introuvable : ${filePath}`)
  const size = fs.statSync(filePath).size

  if (await sameSizeOnR2(key, size)) { console.log(`skip ${key} (déjà sur R2, ${fmt(size)})`); return }

  console.log(`upload ${key} (${fmt(size)})`)
  if (size >= 50 * 1024 * 1024) {
    let last = -10
    const up = new Upload({
      client,
      params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(filePath), ContentType: type },
      partSize: 64 * 1024 * 1024, queueSize: 3,
    })
    up.on('httpUploadProgress', p => {
      const pct = Math.floor(((p.loaded || 0) / size) * 100)
      if (pct >= last + 5) { last = pct; process.stdout.write(`  ${pct}%  ${fmt(p.loaded || 0)} / ${fmt(size)}\n`) }
    })
    await up.done()
  } else {
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME, Key: key, Body: fs.readFileSync(filePath), ContentType: type,
    }))
  }
  console.log(`✓ ${R2_PUBLIC_URL}/${key}`)
}

async function main() {
  console.log(`Bucket: ${R2_BUCKET_NAME}\nSource: ${SOURCE_DIR}\n`)
  for (const f of FILES) await uploadFile(f)
  console.log('\n=== UPLOAD FILM TERMINÉ ===')
}
main().catch(e => { console.error(e); process.exit(1) })
