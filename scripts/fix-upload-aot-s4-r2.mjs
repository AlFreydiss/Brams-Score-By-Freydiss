/**
 * AOT S04 — réparation : les fichiers R2 anime/aot/S04ENN.mp4 sont corrompus
 * (header zéro, pas de moov) et les copies dist/ aussi. Les sources VALIDES sont
 * dans public/anime/[Tsundere-Raws] ... (conteneurs Matroska nommés .mp4).
 * On remux chaque source en VRAI mp4 (h264/aac copiés, +faststart) puis upload R2.
 *
 * Usage : node scripts/fix-upload-aot-s4-r2.mjs
 */
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv() {
  const env = { ...process.env }
  for (const p of [path.join(root, '.env.local'), path.join(root, '.env')]) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}
const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev' } = loadEnv()
if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
  throw new Error('Missing R2 env vars (.env.local)')

const SRC_DIR = 'F:\\Brams-Score-By-Freydiss-new\\public\\anime\\[Tsundere-Raws] Shingeki no Kyojin S4 - BATCH VOSTFR (WKN) [1080p]'
const PREFIX = 'anime/aot'
const TEMP = path.join(os.tmpdir(), 'aot-s4-remux')

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const fmt = b => b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${(b / 1e6).toFixed(0)} MB`
function run(cmd, args) {
  return new Promise((res, rej) => {
    const c = spawn(cmd, args, { stdio: 'ignore' })
    c.on('error', rej); c.on('close', code => code === 0 ? res() : rej(new Error(`${cmd} exit ${code}`)))
  })
}
async function exists(key) {
  try { const h = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return Number(h.ContentLength || 0) } catch { return 0 }
}
async function upload(localPath, key) {
  const up = new Upload({ client, params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(localPath), ContentType: 'video/mp4' }, partSize: 64 * 1024 * 1024, queueSize: 3 })
  await up.done()
}

async function main() {
  fs.mkdirSync(TEMP, { recursive: true })
  const files = fs.readdirSync(SRC_DIR).filter(f => /\.mp4$/i.test(f))
  // " S4 - NN " → numéro d'épisode
  const jobs = files.map(f => {
    const m = f.match(/S4\s*-\s*(\d{1,2})/i)
    return m ? { ep: parseInt(m[1], 10), file: f } : null
  }).filter(Boolean).sort((a, b) => a.ep - b.ep)

  console.log(`${jobs.length} épisodes S04 à réparer\n`)
  for (const { ep, file } of jobs) {
    const key = `${PREFIX}/S04E${String(ep).padStart(2, '0')}.mp4`
    const srcPath = path.join(SRC_DIR, file)
    const tmp = path.join(TEMP, `S04E${String(ep).padStart(2, '0')}.mp4`)
    try {
      process.stdout.write(`Ep${ep} → remux...`)
      await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', srcPath,
        '-map', '0:v:0', '-map', '0:a:0', '-c', 'copy', '-movflags', '+faststart', tmp])
      const size = fs.statSync(tmp).size
      process.stdout.write(` ${fmt(size)} upload...`)
      await upload(tmp, key)
      fs.unlinkSync(tmp)
      console.log(` ✓ ${key}`)
    } catch (e) {
      console.log(` ÉCHEC ${e.message}`)
    }
  }
  console.log('\n=== AOT S04 RÉPARÉ ===')
}
main().catch(e => { console.error(e); process.exit(1) })
