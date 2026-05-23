import { HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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
  DBS_HLS_START = '',
  DBS_HLS_END = '',
} = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars.')
}

const localDir = path.join('F:', 'Brams-Score-By-Freydiss', 'brams-website', 'public', 'anime', 'Dragon Ball Super S01 MULTi 1080p WEB x264 AAC -Tsundere-Raws (ADN)')
const keyPrefix = 'anime/dbs-hls'
const tempRoot = path.join(os.tmpdir(), 'brams-dbs-hls')

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const contentTypes = {
  '.m3u8': 'application/vnd.apple.mpegurl; charset=utf-8',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
}

function getEpisode(filename) {
  const match = filename.match(/S01E(\d{1,3})/i)
  return match ? Number(match[1]) : null
}

function formatBytes(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.round(bytes / 1e3)} KB`
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

async function objectExists(key, size = null) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    return size == null || Number(head.ContentLength || 0) === size
  } catch {
    return false
  }
}

async function hasUploadedEpisode(episode) {
  const key = `${keyPrefix}/S01E${String(episode).padStart(3, '0')}/master.m3u8`
  return await objectExists(key)
}

async function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function writeMasterPlaylist(dir) {
  fs.writeFileSync(path.join(dir, 'master.m3u8'), [
    '#EXTM3U',
    '#EXT-X-VERSION:7',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="VF",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="fr",URI="audio-fr.m3u8"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Japonais",DEFAULT=NO,AUTOSELECT=YES,LANGUAGE="ja",URI="audio-ja.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=3800000,AVERAGE-BANDWIDTH=3500000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="audio"',
    'video.m3u8',
    '',
  ].join('\n'))
}

async function buildHls(file, outDir) {
  await removeDir(outDir)
  fs.mkdirSync(outDir, { recursive: true })

  await run(FFMPEG_PATH, [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    file.path,
    '-map',
    '0:v:0',
    '-c:v',
    'copy',
    '-an',
    '-f',
    'hls',
    '-hls_time',
    '20',
    '-hls_playlist_type',
    'vod',
    '-hls_segment_type',
    'fmp4',
    '-hls_fmp4_init_filename',
    'video_init.mp4',
    '-hls_segment_filename',
    path.join(outDir, 'video_%05d.m4s'),
    path.join(outDir, 'video.m3u8'),
  ])

  for (const [stream, name] of [['0:a:0', 'audio-fr'], ['0:a:1', 'audio-ja']]) {
    await run(FFMPEG_PATH, [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      file.path,
      '-map',
      stream,
      '-vn',
      '-c:a',
      'copy',
      '-f',
      'hls',
      '-hls_time',
      '20',
      '-hls_playlist_type',
      'vod',
      '-hls_segment_type',
      'fmp4',
      '-hls_fmp4_init_filename',
      `${name}_init.mp4`,
      '-hls_segment_filename',
      path.join(outDir, `${name}_%05d.m4s`),
      path.join(outDir, `${name}.m3u8`),
    ])
  }

  writeMasterPlaylist(outDir)
}

async function uploadDir(dir, prefix) {
  const files = fs.readdirSync(dir).map(name => {
    const filePath = path.join(dir, name)
    return { name, path: filePath, size: fs.statSync(filePath).size }
  })

  let uploaded = 0
  for (const file of files) {
    const key = `${prefix}/${file.name}`
    if (await objectExists(key, file.size)) continue
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fs.readFileSync(file.path),
      ContentType: contentTypes[path.extname(file.name).toLowerCase()] || 'application/octet-stream',
    }))
    uploaded += 1
  }
  return { files: files.length, uploaded }
}

function updateVideoData(files) {
  const dataPath = path.join(root, 'src', 'data', 'dbs-videos.json')
  const existing = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const byEpisode = new Map(existing.map(item => [item.episode, item]))
  const data = files.map(file => {
    const previous = byEpisode.get(file.episode) || {}
    const ep = String(file.episode).padStart(3, '0')
    return {
      ...previous,
      episode: file.episode,
      title: previous.title || `Episode ${file.episode}`,
      src: `${R2_PUBLIC_URL}/${keyPrefix}/S01E${ep}/master.m3u8`,
      season: 'S01',
      arc: 'Dragon Ball Super',
      defaultSubtitlesOff: true,
      audio: [
        { label: 'VF', srclang: 'fr', default: true },
        { label: 'Japonais', srclang: 'ja' },
      ],
      subtitles: previous.subtitles || [
        {
          label: 'Francais',
          srclang: 'fr',
          src: `${R2_PUBLIC_URL}/anime/dbs-subtitles/Dragon.Ball.Super.S01E${ep}.fr.vtt`,
        },
      ],
    }
  })

  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`Updated ${dataPath}`)
}

if (!fs.existsSync(FFMPEG_PATH)) throw new Error(`ffmpeg not found: ${FFMPEG_PATH}`)

const start = Number.parseInt(DBS_HLS_START || '1', 10)
const end = Number.parseInt(DBS_HLS_END || '131', 10)
const files = fs.readdirSync(localDir)
  .filter(name => name.toLowerCase().endsWith('.mkv'))
  .map(name => {
    const filePath = path.join(localDir, name)
    return { name, path: filePath, episode: getEpisode(name), size: fs.statSync(filePath).size }
  })
  .filter(file => file.episode && file.episode >= start && file.episode <= end)
  .sort((a, b) => a.episode - b.episode)

console.log(`Bucket: ${R2_BUCKET_NAME}`)
console.log(`HLS: ${R2_PUBLIC_URL}/${keyPrefix}`)
console.log(`Episodes: ${files.length} (${start}-${end})`)
console.log(`Input total: ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}`)

for (let index = 0; index < files.length; index += 1) {
  const file = files[index]
  const ep = String(file.episode).padStart(3, '0')
  const episodePrefix = `${keyPrefix}/S01E${ep}`
  const outDir = path.join(tempRoot, `S01E${ep}`)

  if (await hasUploadedEpisode(file.episode)) {
    console.log(`[${index + 1}/${files.length}] skip S01E${ep}`)
    continue
  }

  console.log(`[${index + 1}/${files.length}] build S01E${ep}`)
  await buildHls(file, outDir)
  const size = fs.readdirSync(outDir).reduce((sum, name) => sum + fs.statSync(path.join(outDir, name)).size, 0)
  console.log(`  upload ${formatBytes(size)}`)
  const result = await uploadDir(outDir, episodePrefix)
  console.log(`  files ${result.files}, uploaded ${result.uploaded}`)
  await removeDir(outDir)
}

updateVideoData(
  fs.readdirSync(localDir)
    .filter(name => name.toLowerCase().endsWith('.mkv'))
    .map(name => ({ name, episode: getEpisode(name) }))
    .filter(file => file.episode)
    .sort((a, b) => a.episode - b.episode)
)
