// Transcode (720p, web-friendly) + upload R2 de One Piece OP14 "Fight Together" pour le Blind Test / Tournoi Opening.
// Source : ~/Downloads. Destination : blind-test/op-op14.mp4.
// Usage : node scripts/upload-op14-blindtest-r2.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const root = path.resolve(import.meta.dirname, '..')

// .env.local → process.env
for (const envFile of [path.join(root, '.env.local'), path.join(root, '.env')]) {
  if (!fs.existsSync(envFile)) continue
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev' } = process.env
if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Creds R2 manquantes dans .env.local'); process.exit(1)
}

const DL = path.join(os.homedir(), 'Downloads')
const TRACKS = [
  { id: 'op-op14', src: 'One Piece OP 14 - Fight Together  4K-24FPS  Creditless.mp4' },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-op-'))

for (const t of TRACKS) {
  const input = path.join(DL, t.src)
  if (!fs.existsSync(input)) { console.error(`⚠️  introuvable: ${t.src}`); continue }
  const out = path.join(tmp, `${t.id}.mp4`)
  console.log(`🎬 transcode ${t.id} …`)
  // 720p, 30fps, H.264 CRF 23, AAC 128k, faststart (lecture web progressive).
  execFileSync('ffmpeg', [
    '-y', '-i', input,
    '-vf', 'scale=-2:720', '-r', '30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    out,
  ], { stdio: 'inherit' })

  const key = `blind-test/${t.id}.mp4`
  const size = (fs.statSync(out).size / 1048576).toFixed(1)
  console.log(`⬆️  upload ${key} (${size} Mo) …`)
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME, Key: key,
    Body: fs.createReadStream(out), ContentType: 'video/mp4',
  }))
  console.log(`✅ ${R2_PUBLIC_URL}/${key}`)
}

fs.rmSync(tmp, { recursive: true, force: true })
console.log('🏁 Terminé.')
