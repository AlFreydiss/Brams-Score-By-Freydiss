// Upload new blind test tracks to R2
// Usage: node scripts/upload-blind-test-tracks.mjs
// Requires R2 env vars in .env.local:
//   CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY

import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv() {
  const env = { ...process.env }
  for (const envPath of [path.join(root, '.env.local'), path.join(root, '.env')]) {
    if (!fs.existsSync(envPath)) continue
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}

const env = loadEnv()
const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing R2 env vars. Add to .env.local:')
  console.error('   CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const TRACKS = [
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Black Clover - OP  Opening 3 (Black Rover)  UHD  Creditless  Subtitles.mp4',
    r2Key: 'blind-test/bc-op3.mp4',
    label: 'Black Clover OP3 - Black Rover',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Attack on Titan - Opening 5 【Shoukei to Shikabane no Michi】 4K  UHD Creditless  CC.mp4',
    r2Key: 'blind-test/aot-op5.mp4',
    label: 'Attack on Titan OP5 - Shoukei to Shikabane no Michi',
  },
]

async function uploadTrack({ localPath, r2Key, label }) {
  if (!fs.existsSync(localPath)) {
    console.error(`❌ File not found: ${localPath}`)
    return false
  }
  const size = fs.statSync(localPath).size
  console.log(`\n📤 Uploading ${label}`)
  console.log(`   Source: ${localPath}`)
  console.log(`   Target: r2://${R2_BUCKET_NAME}/${r2Key}`)
  console.log(`   Size: ${(size / 1024 / 1024).toFixed(1)} MB`)

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: fs.createReadStream(localPath),
      ContentType: 'video/mp4',
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024,
  })

  upload.on('httpUploadProgress', p => {
    const pct = p.total ? ((p.loaded / p.total) * 100).toFixed(0) : '?'
    process.stdout.write(`\r   Progress: ${pct}% (${(p.loaded / 1024 / 1024).toFixed(1)} MB)`)
  })

  await upload.done()
  console.log(`\n   ✅ Done → https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/${r2Key}`)
  return true
}

async function main() {
  console.log('🎵 Blind Test Track Upload')
  for (const track of TRACKS) {
    await uploadTrack(track)
  }
  console.log('\n✅ All done!')
}

main().catch(console.error)
