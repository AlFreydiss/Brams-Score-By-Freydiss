import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const env = {}
for (const p of [path.join(root, '.env.local'), path.join(root, '.env')]) {
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
}

const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev' } = env

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const imgPath = "C:\\Users\\Feydi\\Desktop\\vivy-cover.jpg"
const key = 'anime/vivy/key-visual.jpg'

const size = fs.statSync(imgPath).size
const up = new Upload({
  client,
  params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(imgPath), ContentType: 'image/jpeg' },
})
up.on('httpUploadProgress', p => {
  const pct = Math.round((p.loaded / size) * 100)
  process.stdout.write(`\r  Upload: ${pct}%  `)
})
await up.done()
console.log(`\n✓ ${R2_PUBLIC_URL}/${key}`)
