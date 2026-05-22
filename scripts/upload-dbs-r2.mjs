import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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
  FFMPEG_PATH = 'C:\\Users\\Feydi\\Downloads\\TRCC-Setup-EN 2.1.4\\TRCC-Setup-EN\\TRCCCAP\\ffmpeg.exe',
} = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars.')
}

const localDir = path.join('F:', 'Brams-Score-By-Freydiss', 'brams-website', 'public', 'anime', 'Dragon Ball Super S01 MULTi 1080p WEB x264 AAC -Tsundere-Raws (ADN)')
const videoKeyPrefix = 'anime/dbs'
const subtitleKeyPrefix = 'anime/dbs-subtitles'
const tempDir = path.join(os.tmpdir(), 'brams-dbs-subtitles')

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

function formatBytes(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.round(bytes / 1e3)} KB`
}

function getEpisode(filename) {
  const match = filename.match(/S01E(\d{1,3})/i)
  return match ? Number(match[1]) : null
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(stderr || `${command} exited with ${code}`))
    })
  })
}

async function existsOnR2(key, size) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    return Number(head.ContentLength || 0) === size
  } catch {
    return false
  }
}

async function uploadVideo(file, index, total) {
  const key = `${videoKeyPrefix}/${file.name}`
  if (await existsOnR2(key, file.size)) {
    console.log(`[${index + 1}/${total}] skip video E${file.episode} (${formatBytes(file.size)})`)
    return `${R2_PUBLIC_URL}/${key}`
  }

  console.log(`[${index + 1}/${total}] upload video E${file.episode} (${formatBytes(file.size)})`)
  let lastLogged = -10
  const upload = new Upload({
    client,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fs.createReadStream(file.path),
      ContentType: 'video/x-matroska',
    },
    partSize: 64 * 1024 * 1024,
    queueSize: 2,
  })

  upload.on('httpUploadProgress', progress => {
    const pct = Math.floor(((progress.loaded || 0) / file.size) * 100)
    if (pct >= lastLogged + 10) {
      lastLogged = pct
      process.stdout.write(`  ${pct}% ${formatBytes(progress.loaded || 0)} / ${formatBytes(file.size)}\r`)
    }
  })

  await upload.done()
  process.stdout.write('  100% done                                      \n')
  return `${R2_PUBLIC_URL}/${key}`
}

async function extractSubtitle(file, outputPath) {
  await run(FFMPEG_PATH, [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    file.path,
    '-map',
    '0:s:1',
    '-c:s',
    'webvtt',
    outputPath,
  ])
}

async function uploadSubtitle(file, index, total) {
  const outputName = `Dragon.Ball.Super.S01E${String(file.episode).padStart(3, '0')}.fr.vtt`
  const outputPath = path.join(tempDir, outputName)
  const key = `${subtitleKeyPrefix}/${outputName}`

  console.log(`[${index + 1}/${total}] extract subtitles E${file.episode}`)
  await extractSubtitle(file, outputPath)

  const body = fs.readFileSync(outputPath)
  if (await existsOnR2(key, body.length)) {
    console.log(`  skip subtitles ${R2_PUBLIC_URL}/${key}`)
    return `${R2_PUBLIC_URL}/${key}`
  }

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: 'text/vtt; charset=utf-8',
  }))
  console.log(`  upload subtitles ${R2_PUBLIC_URL}/${key}`)
  return `${R2_PUBLIC_URL}/${key}`
}

function updateVideoData(entries) {
  const dataPath = path.join(root, 'src', 'data', 'dbs-videos.json')
  const data = entries.map(entry => ({
    episode: entry.episode,
    title: `Episode ${entry.episode}`,
    src: entry.videoUrl,
    season: 'S01',
    arc: 'Dragon Ball Super',
    defaultSubtitlesOff: true,
    audio: [
      { label: 'VF', srclang: 'fr', default: true },
      { label: 'Japonais', srclang: 'ja' },
    ],
    subtitles: [
      { label: 'Francais', srclang: 'fr', src: entry.subtitleUrl },
    ],
  }))
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`Updated ${dataPath}`)
}

if (!fs.existsSync(FFMPEG_PATH)) throw new Error(`ffmpeg not found: ${FFMPEG_PATH}`)

fs.mkdirSync(tempDir, { recursive: true })

const files = fs.readdirSync(localDir)
  .filter(name => name.toLowerCase().endsWith('.mkv'))
  .map(name => {
    const filePath = path.join(localDir, name)
    return { name, path: filePath, episode: getEpisode(name), size: fs.statSync(filePath).size }
  })
  .filter(file => file.episode)
  .sort((a, b) => a.episode - b.episode)

console.log(`Bucket: ${R2_BUCKET_NAME}`)
console.log(`Videos: ${R2_PUBLIC_URL}/${videoKeyPrefix}`)
console.log(`Subtitles: ${R2_PUBLIC_URL}/${subtitleKeyPrefix}`)
console.log(`Files: ${files.length}`)
console.log(`Total: ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}`)

const entries = []
for (let index = 0; index < files.length; index += 1) {
  const file = files[index]
  const videoUrl = await uploadVideo(file, index, files.length)
  const subtitleUrl = await uploadSubtitle(file, index, files.length)
  entries.push({ episode: file.episode, videoUrl, subtitleUrl })
}

updateVideoData(entries)
