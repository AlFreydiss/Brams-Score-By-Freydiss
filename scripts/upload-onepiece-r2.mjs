import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
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
} = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars.')
}

const localDir = path.join(root, 'public', 'anime', 'One.Piece.Arc.Egghead.E1086-1155.VOSTFR.1080p.WEBRiP.x265-KAF')
const keyPrefix = 'anime/op-egghead'

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
  const match = filename.match(/E(\d{4})/i)
  return match ? Number(match[1]) : null
}

async function existsOnR2(key, size) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    return Number(head.ContentLength || 0) === size
  } catch {
    return false
  }
}

async function uploadFile(file, index, total) {
  const localPath = path.join(localDir, file.name)
  const key = `${keyPrefix}/${file.name}`

  if (await existsOnR2(key, file.size)) {
    console.log(`[${index + 1}/${total}] skip ${key} (${formatBytes(file.size)})`)
    return `${R2_PUBLIC_URL}/${key}`
  }

  console.log(`\n[${index + 1}/${total}] upload ${key} (${formatBytes(file.size)})`)
  let lastLogged = -10
  const upload = new Upload({
    client,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentType: 'video/x-matroska',
    },
    partSize: 64 * 1024 * 1024,
    queueSize: 2,
  })

  upload.on('httpUploadProgress', (progress) => {
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

function updateVideoData(urlByEpisode) {
  const dataPath = path.join(root, 'src', 'data', 'onepiece-videos.js')
  const publicBase = `${R2_PUBLIC_URL}/${keyPrefix}`
  const source = `const BASE_PATH = '${publicBase}'\n\nconst SPECIAL_FILENAMES = {\n  1120: 'One.Piece.E1120.v2.VOSTFR.1080p.WEBRiP.x265-KAF.mkv',\n}\n\nexport default Array.from({ length: 70 }, (_, index) => {\n  const episode = 1086 + index\n  const filename = SPECIAL_FILENAMES[episode] || \`One.Piece.E\${episode}.VOSTFR.1080p.WEBRiP.x265-KAF.mkv\`\n\n  return {\n    episode,\n    title: \`Episode \${episode}\`,\n    src: \`\${BASE_PATH}/\${filename}\`,\n    season: 'Egghead',\n    arc: 'Arc Egghead',\n  }\n})\n`
  fs.writeFileSync(dataPath, source)
  console.log(`\nUpdated ${dataPath}`)
  console.log(`R2 URLs ready for ${urlByEpisode.size} episodes.`)
}

const files = fs.readdirSync(localDir)
  .filter((name) => name.toLowerCase().endsWith('.mkv'))
  .map((name) => ({ name, episode: getEpisode(name), size: fs.statSync(path.join(localDir, name)).size }))
  .filter((file) => file.episode)
  .sort((a, b) => a.episode - b.episode)

console.log(`Bucket: ${R2_BUCKET_NAME}`)
console.log(`Prefix: ${keyPrefix}`)
console.log(`Files: ${files.length}`)
console.log(`Total: ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}`)

const urlByEpisode = new Map()
for (let index = 0; index < files.length; index += 1) {
  const url = await uploadFile(files[index], index, files.length)
  urlByEpisode.set(files[index].episode, url)
}

updateVideoData(urlByEpisode)
