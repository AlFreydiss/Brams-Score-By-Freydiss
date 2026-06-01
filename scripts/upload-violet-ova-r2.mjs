/**
 * Violet Evergarden OVA — transcode web + upload R2.
 *
 * Source MKV streams:
 *   0:v:0 video HEVC 10-bit
 *   0:a:0 VF AAC
 *   0:a:1 JP AAC
 *   0:s:1 FR full subtitles
 *
 * Output model used by VideoPlayer:
 *   one silent H264 MP4 video + two external AAC audio tracks.
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envCandidates = [path.join(root, '.env'), path.join(root, '.env.local')]

function loadEnv() {
  const env = { ...process.env }
  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) continue
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) env[match[1].trim()] = match[2].trim()
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
  FFMPEG_PATH = 'ffmpeg',
} = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars.')
}

const SOURCE = process.env.VE_OVA_SOURCE
  || 'F:\\Brams-Score-By-Freydiss-new\\public\\anime\\Violet Evergarden S01 + OVA (2018) CUSTOM MULTi 1080p 10bits BluRay x265 AAC -Punisher694\\Violet Evergarden S01E14 (OVA) MULTi 1080p 10bits BluRay x265 AAC -Punisher694.mkv'
const OUT_DIR = process.env.VE_OVA_OUT_DIR
  || 'F:\\Brams-Score-By-Freydiss-new\\public\\anime\\violet-evergarden'
const PREFIX = 'anime/violet-evergarden'

const FILES = [
  { local: 'ova.mp4',    key: `${PREFIX}/ova.mp4`,    type: 'video/mp4' },
  { local: 'ova.ja.m4a', key: `${PREFIX}/ova.ja.m4a`, type: 'audio/mp4' },
  { local: 'ova.vf.m4a', key: `${PREFIX}/ova.vf.m4a`, type: 'audio/mp4' },
  { local: 'ova.fr.vtt', key: `${PREFIX}/ova.fr.vtt`, type: 'text/vtt; charset=utf-8' },
  { local: 'ova.jpg',    key: `${PREFIX}/ova.jpg`,    type: 'image/jpeg' },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const fmt = bytes => bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stdout.on('data', chunk => process.stdout.write(chunk))
    child.stderr.on('data', chunk => { stderr += chunk.toString(); process.stderr.write(chunk) })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr || `${command} exited with ${code}`)))
  })
}

async function sameSizeOnR2(key, size) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    return Number(head.ContentLength || 0) === size
  } catch {
    return false
  }
}

async function uploadFile({ local, key, type }) {
  const filePath = path.join(OUT_DIR, local)
  if (!fs.existsSync(filePath)) throw new Error(`Missing output file: ${filePath}`)
  const size = fs.statSync(filePath).size

  if (await sameSizeOnR2(key, size)) {
    console.log(`skip ${key} (${fmt(size)})`)
    return `${R2_PUBLIC_URL}/${key}`
  }

  console.log(`upload ${key} (${fmt(size)})`)
  if (size >= 50 * 1024 * 1024) {
    let last = -10
    const upload = new Upload({
      client,
      params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(filePath), ContentType: type },
      partSize: 64 * 1024 * 1024,
      queueSize: 3,
    })
    upload.on('httpUploadProgress', progress => {
      const pct = Math.floor(((progress.loaded || 0) / size) * 100)
      if (pct >= last + 10) {
        last = pct
        process.stdout.write(`  ${pct}% ${fmt(progress.loaded || 0)} / ${fmt(size)}\n`)
      }
    })
    await upload.done()
  } else {
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fs.readFileSync(filePath),
      ContentType: type,
    }))
  }
  return `${R2_PUBLIC_URL}/${key}`
}

async function ensureOutputs() {
  if (!fs.existsSync(SOURCE)) throw new Error(`Source introuvable: ${SOURCE}`)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const video = path.join(OUT_DIR, 'ova.mp4')
  const ja = path.join(OUT_DIR, 'ova.ja.m4a')
  const vf = path.join(OUT_DIR, 'ova.vf.m4a')
  const sub = path.join(OUT_DIR, 'ova.fr.vtt')
  const thumb = path.join(OUT_DIR, 'ova.jpg')

  if (!fs.existsSync(video)) {
    console.log('Transcode video HEVC 10-bit -> H264 MP4, no audio...')
    await run(FFMPEG_PATH, [
      '-y', '-hide_banner',
      '-i', SOURCE,
      '-map', '0:v:0',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '21',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      video,
    ])
  }

  if (!fs.existsSync(ja)) {
    console.log('Extract JP audio...')
    await run(FFMPEG_PATH, ['-y', '-hide_banner', '-loglevel', 'error', '-i', SOURCE, '-map', '0:a:1', '-c:a', 'copy', ja])
  }

  if (!fs.existsSync(vf)) {
    console.log('Extract VF audio...')
    await run(FFMPEG_PATH, ['-y', '-hide_banner', '-loglevel', 'error', '-i', SOURCE, '-map', '0:a:0', '-c:a', 'copy', vf])
  }

  if (!fs.existsSync(sub)) {
    console.log('Extract FR full subtitles...')
    await run(FFMPEG_PATH, ['-y', '-hide_banner', '-loglevel', 'error', '-i', SOURCE, '-map', '0:s:1', '-c:s', 'webvtt', sub])
  }

  if (!fs.existsSync(thumb)) {
    console.log('Generate thumbnail...')
    await run(FFMPEG_PATH, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-ss', '00:06:00',
      '-i', SOURCE,
      '-frames:v', '1',
      '-vf', 'scale=640:-1',
      '-q:v', '3',
      thumb,
    ])
  }
}

function updateJson(urls) {
  const dataPath = path.join(root, 'src', 'data', 'violet-evergarden-videos.json')
  const videos = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const entry = {
    episode: 14,
    title: "OVA - Le jour ou tu comprendras l'Amour viendra surement",
    kind: 'ova',
    badge: 'OAV VF/VOSTFR',
    src: urls['ova.mp4'],
    season: 'OVA',
    arc: 'Violet Evergarden',
    preferredAudioLang: 'ja',
    audio: [
      { label: 'Japonais', srclang: 'ja', default: true, src: urls['ova.ja.m4a'] },
      { label: 'VF', srclang: 'fr', src: urls['ova.vf.m4a'] },
    ],
    subtitles: [
      { label: 'Francais', srclang: 'fr', src: urls['ova.fr.vtt'] },
    ],
    thumbnail: urls['ova.jpg'],
  }
  const withoutOva = videos.filter(v => !(v.kind === 'ova' && Number(v.episode) === 14))
  const movieIndex = withoutOva.findIndex(v => v.kind === 'film')
  if (movieIndex >= 0) withoutOva.splice(movieIndex, 0, entry)
  else withoutOva.push(entry)
  fs.writeFileSync(dataPath, `${JSON.stringify(withoutOva, null, 2)}\n`, 'utf8')
  console.log(`updated ${dataPath}`)
}

async function main() {
  console.log(`Source: ${SOURCE}`)
  console.log(`Out: ${OUT_DIR}`)
  await ensureOutputs()

  const urls = {}
  for (const file of FILES) urls[file.local] = await uploadFile(file)
  updateJson(urls)
  console.log('=== Violet Evergarden OVA done ===')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
