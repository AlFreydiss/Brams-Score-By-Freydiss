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
  // ── Fix tracks manquants (404) ──────────────────────────────────────────────
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Steins;Gate - Opening 【Hacking to the Gate】 4K 60FPS Creditless  CC.mp4',
    r2Key: 'blind-test/sg-op1.mp4',
    label: 'Steins;Gate OP1 - Hacking to the Gate',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\TVアニメ『ヴァニタスの手記』第2クールノンクレジットオープニングムービー.mp4',
    r2Key: 'blind-test/vanitas-op2.mp4',
    label: 'Vanitas no Carte OP2 - Sora to Utsuro',
  },
  // ── Nouveaux tracks ──────────────────────────────────────────────────────────
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Domestic Girlfriend OP - Kawaki wo Ameku  4K-24FPS  Creditless.mp4',
    r2Key: 'blind-test/domestic-op1.mp4',
    label: 'Domestic Girlfriend OP1 - Kawaki wo Ameku',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Fairy Tail Opening 3  4K  60FPS  Creditless .mp4',
    r2Key: 'blind-test/ft-op3.mp4',
    label: 'Fairy Tail OP3 - Ft.',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Opening 2 - Creditless  Fairy Tail  S.O.W. ~Sense of Wonder~  4K 60FPS.mp4',
    r2Key: 'blind-test/ft-op2.mp4',
    label: 'Fairy Tail OP2 - S.O.W. ~Sense of Wonder~',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Opening 3 - Creditless  Fire Force  SPARK-AGAIN  4K 60FPS.mp4',
    r2Key: 'blind-test/ff-op3.mp4',
    label: 'Fire Force OP3 - SPARK-AGAIN',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Opening 5 - Creditless  One Piece  Kokoro no Chizu  4K 60FPS.mp4',
    r2Key: 'blind-test/op-op5.mp4',
    label: 'One Piece OP5 - Kokoro no Chizu',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Opening 6 - Creditless  Fairy Tail  Fiesta  4K 60FPS.mp4',
    r2Key: 'blind-test/ft-op6.mp4',
    label: 'Fairy Tail OP6 - Fiesta',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Death Note OP 1 [4K  60FPS  Creditless].mp4',
    r2Key: 'blind-test/dn-op1.mp4',
    label: 'Death Note OP1 - The World',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Dragon Ball Kai Opening 1  4K Upscaled  Creditless.mp4',
    r2Key: 'blind-test/dbk-op1.mp4',
    label: 'Dragon Ball Kai OP1 - Dragon Soul',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\lv_0_20260524160023.mp4',
    r2Key: 'blind-test/dbz-op1.mp4',
    label: 'Dragon Ball Z OP1 - CHA-LA HEAD-CHA-LA',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Kill La Kill OP2 ambiguous (English credits + lyrics).mp4',
    r2Key: 'blind-test/klk-op2.mp4',
    label: 'Kill la Kill OP2 - ambiguous',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\「Creditless」Akame ga Kill OP _ Opening 2「UHD 60FPS」.mp4',
    r2Key: 'blind-test/agk-op2.mp4',
    label: 'Akame ga Kill OP2 - Liar Mask',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\[4K _ 60FPS] Violet Evergarden Opening Creditless.mp4',
    r2Key: 'blind-test/ve-op1.mp4',
    label: 'Violet Evergarden OP1 - Sincerely',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\cutteryt.mp4',
    r2Key: 'blind-test/ylia-op1.mp4',
    label: 'Your Lie in April OP1 - Hikaru Nara',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\cutteryt (1).mp4',
    r2Key: 'blind-test/hxh-op1.mp4',
    label: 'Hunter x Hunter OP1 - Departure!',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\cutteryt (2).mp4',
    r2Key: 'blind-test/amdb-op1.mp4',
    label: "The Ancient Magus' Bride OP1 - Here",
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Fate Zero - Opening 1 4K 60FPS Creditless.mp4',
    r2Key: 'blind-test/fz-op1.mp4',
    label: 'Fate/Zero OP1 - oath sign',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\cutteryt (3).mp4',
    r2Key: 'blind-test/bleach-op6.mp4',
    label: 'Bleach OP6 - Alones',
  },
  {
    localPath: 'C:\\Users\\Feydi\\Downloads\\Sword Art Online Alicization _ War Of Underworld Opening 2 『 AMV 』 - ANIMA Full (1).mp4',
    r2Key: 'blind-test/sao-wou-op2.mp4',
    label: 'SAO Alicization WoU OP2 - ANIMA',
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
  console.log('🎵 Blind Test Track Upload — 20 fichiers')
  let ok = 0
  for (const track of TRACKS) {
    const success = await uploadTrack(track)
    if (success) ok++
  }
  console.log(`\n✅ ${ok}/${TRACKS.length} fichiers uploadés.`)
}

main().catch(console.error)
