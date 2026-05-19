import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const baseDir = path.join(root, 'public', 'anime', 'Dr.Stone', 'Dr. Stone Henshu')

const {
  CF_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev',
} = process.env

const files = [
  { episode: 1, local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 01 - Prologue [SST].mp4'), key: 'anime/drs/Ep01.mp4', mime: 'video/mp4' },
  { episode: 2, local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 02 - Dr Stone, le commencement [SST].mp4'), key: 'anime/drs/Ep02.mp4', mime: 'video/mp4' },
  { episode: 3, local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 03 - Nous brandirons la lumière de la science [SST].mp4'), key: 'anime/drs/Ep03.mp4', mime: 'video/mp4' },
  { episode: 4, local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 04 - Sauvons Ruri ! [SST].mp4'), key: 'anime/drs/Ep04.mp4', mime: 'video/mp4' },
  { episode: 5, local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 05 - Les origines du village Ishigami_hardsub.mp4'), key: 'anime/drs/Ep05.mp4', mime: 'video/mp4' },
  { episode: 6, local: path.join('Saison 1', '[Roro] Dr Stone Henshû 06 - Le téléphone portable_hardsub.mp4'), key: 'anime/drs/Ep06.mp4', mime: 'video/mp4' },
  { episode: 7, local: path.join('Saison 1', '[Roro] Dr Stone Henshû 07 - Chrome le Scientifique_hardsub.mp4'), key: 'anime/drs/Ep07.mp4', mime: 'video/mp4' },
  { episode: 8, local: path.join('Saison 1', '[Roro] Dr Stone Henshû 08 - Cryogénisation_hardsub.mp4'), key: 'anime/drs/Ep08.mp4', mime: 'video/mp4' },
  { episode: 10, local: path.join('Saison 2', '[MECHAPOULPE] Dr Stone Henshu - 10 - Objectif Perseus [SST].mp4'), key: 'anime/drs/Ep10.mp4', mime: 'video/mp4' },
  { episode: 11, local: path.join('Saison 2', 'Dr Stone Henshu - 11.mkv.mkv'), key: 'anime/drs/Ep11.mkv', mime: 'video/x-matroska' },
  { episode: 12, local: path.join('Saison 2', '[MECHAPOULPE] Dr Stone Henshu - 12 - Médusa [SST].mp4'), key: 'anime/drs/Ep12.mp4', mime: 'video/mp4' },
  { episode: 13, local: path.join('Saison 2', '[MECHAPOULPE] Dr Stone Henshu - 13 - Nouvel objectif [SST].mp4'), key: 'anime/drs/Ep13.mp4', mime: 'video/mp4' },
]

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars.')
}

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

async function uploadFile(file, index) {
  const localPath = path.join(baseDir, file.local)
  if (!fs.existsSync(localPath)) {
    console.log(`[${index + 1}/${files.length}] missing: ${file.local}`)
    return null
  }

  const size = fs.statSync(localPath).size
  console.log(`\n[${index + 1}/${files.length}] ${file.key} ${formatBytes(size)}`)
  let lastLogged = -10
  const upload = new Upload({
    client,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: file.key,
      Body: fs.createReadStream(localPath),
      ContentType: file.mime,
    },
    partSize: 64 * 1024 * 1024,
    queueSize: 2,
  })

  upload.on('httpUploadProgress', (progress) => {
    const pct = Math.floor(((progress.loaded || 0) / size) * 100)
    if (pct >= lastLogged + 10) {
      lastLogged = pct
      process.stdout.write(`  ${pct}% ${formatBytes(progress.loaded || 0)} / ${formatBytes(size)}\r`)
    }
  })

  await upload.done()
  process.stdout.write('  100% done                                      \n')
  return `${R2_PUBLIC_URL}/${file.key}`
}

const results = []
for (let index = 0; index < files.length; index += 1) {
  const url = await uploadFile(files[index], index)
  if (url) results.push({ ...files[index], url })
}

const jsonPath = path.join(root, 'src', 'data', 'drstone-videos.json')
const videos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
const byEpisode = new Map(results.map((item) => [item.episode, item.url]))

for (const video of videos) {
  if (byEpisode.has(video.episode)) {
    video.src = byEpisode.get(video.episode)
  }
}

fs.writeFileSync(jsonPath, `${JSON.stringify(videos, null, 2)}\n`)
console.log(`\nUpdated ${jsonPath}`)
console.log(`Uploaded ${results.length}/${files.length}`)
