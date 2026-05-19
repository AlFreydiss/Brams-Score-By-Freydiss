import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env manually
const envPath = path.join(__dirname, '..', '.env')
const envVars = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) envVars[m[1].trim()] = m[2].trim()
}

const {
  CF_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL,
} = envVars

const TPN_DIR = path.join(__dirname, '..', 'public', 'anime', 'tpn')

const FILES = [
  { local: 'Yakusoku no Neverland - 01 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep01.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 02 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep02.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 03 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep03.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 04 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep04.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 05 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep05.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 06 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep06.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 07 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep07.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 08 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep08.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 09 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep09.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 10 MULTi BD 1080p x264 AAC -Fuceo [SST].mp4', key: 'anime/tpn/Ep10.mp4', mime: 'video/mp4' },
  { local: 'ep11_hardsub_ULTRA_GPU.mp4',                                            key: 'anime/tpn/Ep11.mp4', mime: 'video/mp4' },
  { local: 'Yakusoku no Neverland - 12 [HARDSUB].mkv',                             key: 'anime/tpn/Ep12.mkv', mime: 'video/x-matroska' },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

function formatBytes(b) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

async function uploadFile(file, index) {
  const localPath = path.join(TPN_DIR, file.local)
  if (!fs.existsSync(localPath)) {
    console.log(`[${index + 1}/12] SKIP (not found): ${file.local}`)
    return null
  }
  const size = fs.statSync(localPath).size
  console.log(`\n[${index + 1}/12] Uploading ${file.key} (${formatBytes(size)})...`)

  let lastLogged = 0
  const upload = new Upload({
    client,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: file.key,
      Body: fs.createReadStream(localPath),
      ContentType: file.mime,
    },
    partSize: 64 * 1024 * 1024, // 64 MB parts
    queueSize: 2,
  })

  upload.on('httpUploadProgress', (progress) => {
    const pct = Math.floor(((progress.loaded || 0) / size) * 100)
    if (pct >= lastLogged + 10) {
      lastLogged = pct
      process.stdout.write(`  ${pct}% (${formatBytes(progress.loaded || 0)} / ${formatBytes(size)})\r`)
    }
  })

  await upload.done()
  process.stdout.write(`  100% — done!                          \n`)
  return `${R2_PUBLIC_URL}/${file.key}`
}

async function main() {
  console.log(`Bucket: ${R2_BUCKET_NAME}`)
  console.log(`Endpoint: https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`)
  console.log(`Files: ${FILES.length}\n`)

  const results = []
  for (let i = 0; i < FILES.length; i++) {
    const url = await uploadFile(FILES[i], i)
    results.push({ file: FILES[i], url })
  }

  // Update tpn-videos.json
  const jsonPath = path.join(__dirname, '..', 'src', 'data', 'tpn-videos.json')
  const videos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

  const epToR2 = {}
  for (const { file, url } of results) {
    if (url) {
      const ep = parseInt(file.key.match(/Ep(\d+)/)[1], 10)
      epToR2[ep] = url
    }
  }

  for (const v of videos) {
    if (epToR2[v.episode]) v.src = epToR2[v.episode]
  }

  fs.writeFileSync(jsonPath, JSON.stringify(videos, null, 2))
  console.log(`\ntpn-videos.json updated with R2 URLs.`)
  console.log('Done!')
}

main().catch(err => { console.error(err); process.exit(1) })
