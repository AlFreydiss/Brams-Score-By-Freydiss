import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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
  OP_START = '',
  OP_END = '',
} = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars.')
}

const localDir = path.join('F:', 'Brams-Score-By-Freydiss', 'brams-website', 'public', 'anime', 'One.Piece.Arc.Egghead.E1086-1155.VOSTFR.1080p.WEBRiP.x265-KAF')
const keyPrefix = 'anime/op-egghead-subtitles'
const tempDir = path.join(os.tmpdir(), 'brams-onepiece-subtitles')
const specialFiles = [
  {
    episode: 1163,
    name: '[Kaerizaki-Fansub]_One_Piece_1163_[VOSTFR][FHD_1080p][HEVC_x265][10Bit].mkv',
    path: 'F:\\Brams-Score-By-Freydiss-new\\public\\anime\\[Kaerizaki-Fansub]_One_Piece_1163_[VOSTFR][FHD_1080p][HEVC_x265][10Bit].mkv',
  },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

function getEpisode(filename) {
  const match = filename.match(/E(\d{4})/i)
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

async function uploadVtt(filePath, key) {
  const body = fs.readFileSync(filePath)
  if (await existsOnR2(key, body.length)) return 'skip'

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: 'text/vtt; charset=utf-8',
  }))
  return 'upload'
}

if (!fs.existsSync(FFMPEG_PATH)) {
  throw new Error(`ffmpeg not found: ${FFMPEG_PATH}`)
}

fs.mkdirSync(tempDir, { recursive: true })

const start = OP_START ? Number(OP_START) : null
const end = OP_END ? Number(OP_END) : null

const files = [
  ...fs.readdirSync(localDir)
  .filter(name => name.toLowerCase().endsWith('.mkv'))
  .map(name => ({ name, episode: getEpisode(name), path: path.join(localDir, name) })),
  ...specialFiles,
]
  .filter(file => file.episode)
  .filter(file => (start === null || file.episode >= start) && (end === null || file.episode <= end))
  .sort((a, b) => a.episode - b.episode)

console.log(`Files: ${files.length}`)
console.log(`Output: ${R2_PUBLIC_URL}/${keyPrefix}`)

for (let index = 0; index < files.length; index += 1) {
  const file = files[index]
  const outputName = `One.Piece.E${file.episode}.fr.vtt`
  const outputPath = path.join(tempDir, outputName)
  const key = `${keyPrefix}/${outputName}`

  console.log(`[${index + 1}/${files.length}] extract E${file.episode}`)
  await run(FFMPEG_PATH, [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    file.path,
    '-map',
    '0:s:0',
    '-c:s',
    'webvtt',
    outputPath,
  ])

  const result = await uploadVtt(outputPath, key)
  console.log(`  ${result} ${R2_PUBLIC_URL}/${key}`)
}
