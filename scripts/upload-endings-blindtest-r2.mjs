// Transcode (1080p) + upload R2 des ENDINGS ajoutés au Blind Test / Tournoi.
// Destination : blind-test/<id>.mp4. Usage : node scripts/upload-endings-blindtest-r2.mjs
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
  console.error('❌ Creds R2 manquantes'); process.exit(1)
}

const DL = path.join(os.homedir(), 'Downloads')
const TRACKS = [
  { id: 'fz-ed1',       src: '페이트 제로 1쿨 엔딩 「Memoria」.mp4' },
  { id: 'op-ed15',      src: 'One Piece ED 15 4k.mp4' },
  { id: 'bleach-ed12',  src: '【期間限定】TVアニメ『BLEACH』ED映像｜「ヒトヒラのハナビラ」ステレオポニー.mp4' },
  { id: 'bleach-ed5',   src: 'ENDING 5  BLEACH  Life by YUI  VIZ.mp4' },
  { id: 'vinland-ed1',  src: 'Vinland Saga - Ending 1 【Torches】 4K 60FPS Creditless  CC.mp4' },
  { id: 'vinland-ed2',  src: 'Vinland Saga - Ending 2 【Drown】 4K 60FPS Creditless  CC.mp4' },
  { id: 'dn-ed1',       src: 'Death Note - Ending 1 [4K 60FPS  Creditless  CC].mp4' },
  { id: 'ylia-ed2',     src: 'Your Lie in April - Ending 2 【Orange】 4K 60FPS Creditless  CC.mp4' },
  { id: 'tr-ed1',       src: 'Ending 1 - Creditless  Tokyo Revengers  Koko de Iki o Shite  4K 60FPS.mp4' },
  { id: 'bleach-ed1',   src: 'ENDING 1  BLEACH  Life is Like a Boat by Rie fu  VIZ.mp4' },
  { id: 'fmab-ed1',     src: 'Fullmetal Alchemist Brotherhood - Ending 1 [4K 60FPS  Creditless  CC].mp4' },
  { id: 'hxh-ed5',      src: 'Hunter x Hunter (2011) - Ending 5 【Hyouriittai】 4K 60FPS Creditless  CC.mp4' },
  { id: 'mha-ed2',      src: 'My Hero Academia - Ending 2 v2 [4K 60FPS  Creditless  CC].mp4' },
  { id: 'aot-ed7',      src: 'Attack on Titan ED  Ending 7 - Creditless  4K  60FPS  Lyrics.mp4' },
  { id: 'hxh-ed2',      src: 'Hunter x Hunter (2011) - Ending 2 【HUNTING FOR YOUR DREAM】 4K 60FPS Creditless  CC.mp4' },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-ed-'))

for (const t of TRACKS) {
  const input = path.join(DL, t.src)
  if (!fs.existsSync(input)) { console.error(`⚠️  introuvable: ${t.src}`); continue }
  const out = path.join(tmp, `${t.id}.mp4`)
  console.log(`🎬 ${t.id} …`)
  execFileSync('ffmpeg', [
    '-y', '-i', input,
    '-vf', 'scale=-2:1080', '-r', '30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out,
  ], { stdio: ['ignore', 'ignore', 'inherit'] })
  const key = `blind-test/${t.id}.mp4`
  const size = (fs.statSync(out).size / 1048576).toFixed(1)
  await client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(out), ContentType: 'video/mp4' }))
  console.log(`✅ ${key} (${size} Mo)`)
}
fs.rmSync(tmp, { recursive: true, force: true })
console.log('🏁 Endings terminés.')
