import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
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

const localDir = path.join(root, 'public', 'Violet Evergarden', '[Refrain] Violet Evergarden (01-13) VF VOSTFR [1080p]')
const jpVideoDir = path.join(root, 'public', 'Violet Evergarden', 'video-jp')
const vfVideoDir = path.join(root, 'public', 'Violet Evergarden', 'video-fr')
const audioDir = path.join(root, 'public', 'Violet Evergarden', 'audio-fr')
const subtitleDir = path.join(root, 'public', 'Violet Evergarden', 'subtitles')
const thumbnailDir = path.join(root, 'public', 'Violet Evergarden', 'thumbnails')

const jpVideoKeyPrefix = 'anime/violet-evergarden-jp'
const vfVideoKeyPrefix = 'anime/violet-evergarden-vf'
const audioKeyPrefix = 'anime/violet-evergarden-audio-fr'
const subtitleKeyPrefix = 'anime/violet-evergarden-subtitles'
const thumbnailKeyPrefix = 'anime/violet-evergarden-thumbnails'

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
  const match = filename.match(/-\s*(\d{2})\s+VF VOSTFR/i)
  return match ? Number(match[1]) : null
}

async function ensureVfVideo(file, ep3) {
  fs.mkdirSync(vfVideoDir, { recursive: true })
  const outputPath = path.join(vfVideoDir, `Ep${ep3}.mp4`)
  if (!fs.existsSync(outputPath)) {
    await run(FFMPEG_PATH, [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      file.path,
      '-i',
      path.join(audioDir, `Ep${ep3}.m4a`),
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outputPath,
    ])
  }
  return outputPath
}

async function ensureJpVideo(file, ep3) {
  fs.mkdirSync(jpVideoDir, { recursive: true })
  const outputPath = path.join(jpVideoDir, `Ep${ep3}.mp4`)
  if (!fs.existsSync(outputPath)) {
    await run(FFMPEG_PATH, [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      file.path,
      '-map',
      '0:v:0',
      '-map',
      '0:a:1',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputPath,
    ])
  }
  return outputPath
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

async function uploadFile({ key, filePath, contentType, label }) {
  const size = fs.statSync(filePath).size
  if (await existsOnR2(key, size)) {
    console.log(`skip ${label} (${formatBytes(size)})`)
    return `${R2_PUBLIC_URL}/${key}`
  }

  console.log(`upload ${label} (${formatBytes(size)})`)
  if (size >= 50 * 1024 * 1024) {
    let lastLogged = -10
    const upload = new Upload({
      client,
      params: {
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: contentType,
      },
      partSize: 64 * 1024 * 1024,
      queueSize: 2,
    })
    upload.on('httpUploadProgress', progress => {
      const pct = Math.floor(((progress.loaded || 0) / size) * 100)
      if (pct >= lastLogged + 10) {
        lastLogged = pct
        process.stdout.write(`  ${pct}% ${formatBytes(progress.loaded || 0)} / ${formatBytes(size)}\r`)
      }
    })
    await upload.done()
    process.stdout.write('  100% done                                      \n')
  } else {
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fs.readFileSync(filePath),
      ContentType: contentType,
    }))
  }
  return `${R2_PUBLIC_URL}/${key}`
}

async function ensureThumbnail(file, ep3) {
  fs.mkdirSync(thumbnailDir, { recursive: true })
  const outputPath = path.join(thumbnailDir, `Ep${ep3}.jpg`)
  if (!fs.existsSync(outputPath)) {
    await run(FFMPEG_PATH, [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      '00:04:30',
      '-i',
      file.path,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-1',
      '-q:v',
      '3',
      outputPath,
    ])
  }
  return outputPath
}

function updateVideoData(entries) {
  const dataPath = path.join(root, 'src', 'data', 'violet-evergarden-videos.json')
  const data = entries.map(entry => ({
    episode: entry.episode,
    title: `Episode ${entry.episode}`,
    src: entry.jpVideoUrl,
    season: 'S01',
    arc: 'Violet Evergarden',
    audio: [
      { label: 'Japonais', srclang: 'ja', default: true, mediaSrc: entry.jpVideoUrl },
      { label: 'VF', srclang: 'fr', mediaSrc: entry.vfVideoUrl },
    ],
    subtitles: [
      { label: 'Francais', srclang: 'fr', src: entry.subtitleUrl },
    ],
    thumbnail: entry.thumbnailUrl,
  }))
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`Updated ${dataPath}`)
}

if (!fs.existsSync(FFMPEG_PATH)) throw new Error(`ffmpeg not found: ${FFMPEG_PATH}`)

const files = fs.readdirSync(localDir)
  .filter(name => name.toLowerCase().endsWith('.mkv'))
  .map(name => {
    const filePath = path.join(localDir, name)
    return { name, path: filePath, episode: getEpisode(name), size: fs.statSync(filePath).size }
  })
  .filter(file => file.episode)
  .sort((a, b) => a.episode - b.episode)

console.log(`Bucket: ${R2_BUCKET_NAME}`)
console.log(`Files: ${files.length}`)
console.log(`Total video: ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}`)

const entries = []
for (let index = 0; index < files.length; index += 1) {
  const file = files[index]
  const ep3 = String(file.episode).padStart(3, '0')
  console.log(`[${index + 1}/${files.length}] E${ep3}`)

  const videoUrl = await uploadFile({
    key: `${jpVideoKeyPrefix}/Ep${ep3}.mp4`,
    filePath: await ensureJpVideo(file, ep3),
    contentType: 'video/mp4',
    label: `video E${ep3}`,
  })
  const vfVideoPath = await ensureVfVideo(file, ep3)
  const vfVideoUrl = await uploadFile({
    key: `${vfVideoKeyPrefix}/Ep${ep3}.mp4`,
    filePath: vfVideoPath,
    contentType: 'video/mp4',
    label: `video VF E${ep3}`,
  })
  const audioUrl = await uploadFile({
    key: `${audioKeyPrefix}/Ep${ep3}.m4a`,
    filePath: path.join(audioDir, `Ep${ep3}.m4a`),
    contentType: 'audio/mp4',
    label: `audio VF E${ep3}`,
  })
  const subtitleUrl = await uploadFile({
    key: `${subtitleKeyPrefix}/Ep${ep3}.fr.vtt`,
    filePath: path.join(subtitleDir, `Ep${ep3}.fr.vtt`),
    contentType: 'text/vtt; charset=utf-8',
    label: `subtitles E${ep3}`,
  })
  const thumbnailPath = await ensureThumbnail(file, ep3)
  const thumbnailUrl = await uploadFile({
    key: `${thumbnailKeyPrefix}/Ep${ep3}.jpg`,
    filePath: thumbnailPath,
    contentType: 'image/jpeg',
    label: `thumbnail E${ep3}`,
  })

  entries.push({ episode: file.episode, jpVideoUrl: videoUrl, vfVideoUrl, audioUrl, subtitleUrl, thumbnailUrl })
}

updateVideoData(entries)
