import { DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const baseDir = path.join(root, 'public', 'anime', 'Dr.Stone', 'Dr. Stone Henshu')
const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const sstFiles = [
  { episode: 1, key: 'anime/drs/Ep01.mp4', local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 01 - Prologue [SST].mp4') },
  { episode: 2, key: 'anime/drs/Ep02.mp4', local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 02 - Dr Stone, le commencement [SST].mp4') },
  { episode: 3, key: 'anime/drs/Ep03.mp4', local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 03 - Nous brandirons la lumière de la science [SST].mp4') },
  { episode: 4, key: 'anime/drs/Ep04.mp4', local: path.join('Saison 1', '[Khyinn] Dr Stone Henshu - 04 - Sauvons Ruri ! [SST].mp4') },
  { episode: 10, key: 'anime/drs/Ep10.mp4', local: path.join('Saison 2', '[MECHAPOULPE] Dr Stone Henshu - 10 - Objectif Perseus [SST].mp4') },
  { episode: 12, key: 'anime/drs/Ep12.mp4', local: path.join('Saison 2', '[MECHAPOULPE] Dr Stone Henshu - 12 - Médusa [SST].mp4') },
  { episode: 13, key: 'anime/drs/Ep13.mp4', local: path.join('Saison 2', '[MECHAPOULPE] Dr Stone Henshu - 13 - Nouvel objectif [SST].mp4') },
]

const removeNonSst = ['anime/drs/Ep05.mp4', 'anime/drs/Ep06.mp4']

function formatBytes(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.round(bytes / 1e3)} KB`
}

async function exists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }))
    return true
  } catch {
    return false
  }
}

async function upload(file, index) {
  const localPath = path.join(baseDir, file.local)
  if (!fs.existsSync(localPath)) {
    console.log(`[${index + 1}/${sstFiles.length}] missing SST: ${file.local}`)
    return null
  }
  if (await exists(file.key)) {
    console.log(`[${index + 1}/${sstFiles.length}] exists: ${file.key}`)
    return `${publicUrl}/${file.key}`
  }

  const size = fs.statSync(localPath).size
  console.log(`\n[${index + 1}/${sstFiles.length}] upload ${file.key} ${formatBytes(size)}`)
  let last = -10
  const job = new Upload({
    client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: file.key,
      Body: fs.createReadStream(localPath),
      ContentType: 'video/mp4',
    },
    partSize: 64 * 1024 * 1024,
    queueSize: 2,
  })
  job.on('httpUploadProgress', (progress) => {
    const pct = Math.floor(((progress.loaded || 0) / size) * 100)
    if (pct >= last + 10) {
      last = pct
      process.stdout.write(`  ${pct}% ${formatBytes(progress.loaded || 0)} / ${formatBytes(size)}\r`)
    }
  })
  await job.done()
  process.stdout.write('  100% done                                      \n')
  return `${publicUrl}/${file.key}`
}

for (const key of removeNonSst) {
  if (await exists(key)) {
    await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }))
    console.log(`deleted non-SST ${key}`)
  }
}

const uploaded = new Map()
for (let index = 0; index < sstFiles.length; index += 1) {
  const url = await upload(sstFiles[index], index)
  if (url) uploaded.set(sstFiles[index].episode, url)
}

const jsonPath = path.join(root, 'src', 'data', 'drstone-videos.json')
const videos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
for (const video of videos) {
  if (uploaded.has(video.episode)) video.src = uploaded.get(video.episode)
}
fs.writeFileSync(jsonPath, `${JSON.stringify(videos, null, 2)}\n`)
console.log(`updated ${jsonPath}`)
