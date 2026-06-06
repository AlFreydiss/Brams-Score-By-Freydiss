// Batch 2 — transcode (720p web-friendly) + upload R2 d'openings ajoutées au Blind Test / Tournoi Opening.
// Source : ~/Downloads. Destination : blind-test/<id>.mp4.
// Usage : node scripts/upload-openings-batch2-r2.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const root = path.resolve(import.meta.dirname, '..')
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
  { id: 'ns-op13',       src: 'Naruto Shippuden Op Opening  13 [4K 60 FSP].mp4' },
  { id: 'ns-op9',        src: 'Naruto Shippuden Op Opening 9 [4K 60 FSP].mp4' },
  { id: 'ns-op7',        src: 'Naruto Shippuden Op Opening 7 [4K 60 FSP].mp4' },
  { id: 'bc-op8',        src: 'Black Clover - OP  Opening 8 (sky＆blue)  UHD  Creditless  Subtitles.mp4' },
  { id: 'bc-op7',        src: 'Black Clover - OP  Opening 7 (JUSTadICE)  UHD  Creditless  Subtitles.mp4' },
  { id: 'bc-op4',        src: 'Black Clover - OP  Opening 4 (Guess Who Is Back)  UHD  Creditless  Subtitles.mp4' },
  { id: 'bc-op2',        src: 'Black Clover - OP  Opening 2 v1 (PAiNT it BLACK)  UHD  Creditless  Subtitles.mp4' },
  { id: 'op-op25',       src: '＜主題歌 映像フル＞TVアニメ「ONE PIECE」／「最高到達点」歌：SEKAI NO OWARI.mp4' },
  { id: 'op-op21',       src: 'One Piece - Opening 21  4K  60FPS  Creditless..mp4' },
  { id: 'op-op17',       src: 'One Piece OP 17 - Wake up!  4K-24FPS  Creditless.mp4' },
  { id: 'op-op16',       src: 'One Piece OP 16 - Hands Up!  4K-24FPS  Creditless.mp4' },
  { id: 'op-op2',        src: 'One Piece OP 2 - Believe  4K-24FPS  Creditless.mp4' },
  { id: 'op-op3',        src: 'One Piece OP 3 - Hikari E  4K-24FPS  Creditless.mp4' },
  { id: 'op-op6',        src: 'One Piece OP 6 - Brand New World  4K-24FPS  Creditless.mp4' },
  { id: 'op-op8',        src: 'One Piece OP 8 - Crazy Rainbow  4K-24FPS  Creditless.mp4' },
  { id: 'bleach-op5',    src: 'OPENING 5  BLEACH  Rolling Star by YUI  VIZ.mp4' },
  { id: 'bleach-op10',   src: 'OPENING 10  BLEACH  ShojoS by SCANDAL  VIZ.mp4' },
  { id: 'bleach-op3',    src: 'BLEACH opening 3 - 4K 60 FPS.mp4' },
  { id: 'ylia-op2',      src: 'Your Lie in April - Opening 2 【Nanairo Symphony】 4K 60FPS Creditless  CC.mp4' },
  { id: 'mha-op1',       src: 'My Hero Academia - Opening 1 [4K 60FPS  Creditless  CC].mp4' },
  { id: 'franxx-op1',    src: 'Darling in the Franxx Opening  4K  60FPS  Creditless .mp4' },
  { id: 'fairytail-op15',src: 'Fairy Tail Opening 15  Masayume Chasing.mp4' },
  { id: 'op-op20',       src: 'One Piece - Opening 20  Hope  UHD Creditless  Subtitles.mp4' },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-op2-'))

let done = 0, fail = 0
for (const t of TRACKS) {
  const input = path.join(DL, t.src)
  if (!fs.existsSync(input)) { console.error(`⚠️  introuvable: ${t.src}`); fail++; continue }
  const out = path.join(tmp, `${t.id}.mp4`)
  try {
    console.log(`🎬 [${done + fail + 1}/${TRACKS.length}] transcode ${t.id} …`)
    execFileSync('ffmpeg', [
      '-y', '-i', input,
      '-vf', 'scale=-2:720', '-r', '30',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      out,
    ], { stdio: ['ignore', 'ignore', 'ignore'] })

    const key = `blind-test/${t.id}.mp4`
    const size = (fs.statSync(out).size / 1048576).toFixed(1)
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(out), ContentType: 'video/mp4',
    }))
    fs.rmSync(out, { force: true })
    console.log(`✅ ${key} (${size} Mo)`)
    done++
  } catch (e) {
    console.error(`❌ ${t.id}: ${e?.message ?? e}`); fail++
  }
}

fs.rmSync(tmp, { recursive: true, force: true })
console.log(`\n🏁 Terminé — ${done} OK, ${fail} échecs.`)
