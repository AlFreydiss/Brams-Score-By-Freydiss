// Transcode (1080p) + upload R2 des ENDINGS (batch 2) → blind-test/<id>.mp4.
// Alimente Blind Test ending + Tournoi ending (via blindTest.js → LOCAL_TRACKS filter ED).
// Usage : node scripts/upload-endings-batch2-r2.mjs
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
const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env
if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Creds R2 manquantes'); process.exit(1)
}
const DL = path.join(os.homedir(), 'Downloads')
const DESK = path.join(os.homedir(), 'Desktop')

const TRACKS = [
  { id: 'another-ed1',    file: path.join(DL, 'Another (2012) - Ending (Creditless).mp4') },
  { id: 'carole-ed2',     file: path.join(DL, 'Carole & Tuesday ED 2 Not Afraid.mp4') },
  { id: 'arslan-ed1',     file: path.join(DL, 'Arslan senki ending 1.mp4') },
  { id: 'magi-ed1',       file: path.join(DL, 'Magi Labyrinth of magic ending 1 with english sub.mp4') },
  { id: 'sao-wou-ed1',    file: path.join(DL, '[4K60] SAO Alicization —  War of Underworld ED  Lisa — Unlasting (Creditless).mp4') },
  { id: 'ds-ed1',         file: path.join(DL, 'Ending 1 - Creditless  Demon Slayer  From The Edge  4K 60FPS (1).mp4') },
  { id: 'tpn-ed1',        file: path.join(DL, 'The Promised Neverland - Ending 1 【Zettai Zetsumei】 4K 60FPS Creditless  CC.mp4') },
  { id: 'champloo-ed1',   file: path.join(DL, 'Samurai Champloo - Ending [4K 60FPS  Creditless  CC].mp4') },
  { id: 'ds-ed2',         file: path.join(DL, 'Ending 2 - Creditless  Demon Slayer  Shirogane  4K 60FPS.mp4') },
  { id: 'ds-tanjiro',     file: path.join(DL, 'Kimetsu no Yaiba - Episode 19 Ending Theme Kamado Tanjiro No Uta.mp4') },
  { id: 'eva-ed1',        file: path.join(DL, 'Neon Genesis Evangelion - Ending Theme v1「Fly Me to the Moon」Claire.mp4') },
  { id: 'gto-ed1',        file: path.join(DL, 'GTO the Animation - Ending 1  Last Piece.mp4') },
  { id: 'ippo-ed1',       file: path.join(DL, 'Hajime no Ippo Ending 1 -Creditless-.mp4') },
  { id: 'akame-ed2',      file: path.join(DL, 'Akame ga Kill! - Ending 2  Tsuki Akari.mp4') },
  { id: 'gto-ed2',        file: path.join(DL, 'GTO the Animation - Ending 2  Shizuku.mp4') },
  { id: 'beastars-ed-s2', file: path.join(DL, 'TVアニメ「BEASTARS」 第2期エンディング　ノンクレジット版／YOASOBI　『優しい彗星』.mp4') },
  { id: '3gatsu-ed2',     file: path.join(DL, '3-Gatsu no Lion  Ending 2  Creditless  4K  60FPS.mp4') },
  { id: 'naruto-ed1',     file: path.join(DL, 'Naruto  Ending 1 - Wind  VIZ (1).mp4') },
  { id: 'narutos-ed1',    file: path.join(DL, 'Naruto Shippuden - Ending 1  Shooting Star (1).mp4') },
  { id: 'koiame-ed1',     file: path.join(DESK, 'koi wa amegari yo ni ending aimer.mp4') },
  { id: 'mugen-ed1',      file: path.join(DESK, 'EEnding mugen train.mp4') },
  { id: 'violet-ed1',     file: path.join(DESK, 'Violet evergardse ending michishirube.mp4') },
  { id: 'dear-sunrise',   file: path.join(DESK, 'dear-sunrise.mp4') },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-ed2-'))

for (const t of TRACKS) {
  if (!fs.existsSync(t.file)) { console.error(`⚠️  introuvable: ${t.file}`); continue }
  const out = path.join(tmp, `${t.id}.mp4`)
  process.stdout.write(`🎬 ${t.id} …`)
  execFileSync('ffmpeg', [
    '-y', '-i', t.file,
    '-vf', 'scale=-2:1080', '-r', '30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out,
  ], { stdio: ['ignore', 'ignore', 'ignore'] })
  const key = `blind-test/${t.id}.mp4`
  const size = (fs.statSync(out).size / 1048576).toFixed(1)
  await client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(out), ContentType: 'video/mp4' }))
  fs.unlinkSync(out)
  console.log(` ✅ ${key} (${size} Mo)`)
}
fs.rmSync(tmp, { recursive: true, force: true })
console.log('🏁 Endings batch 2 terminés.')
