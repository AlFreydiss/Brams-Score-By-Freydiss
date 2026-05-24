/**
 * Génération miniatures 480x270 JPEG → R2
 * Kaiju: anime/kaiju-no-8-thumbnails/S01E01.jpg
 * Vivy:  anime/vivy-thumbnails/Ep01.jpg
 * Frame extraite à 00:01:30 (keyframe seek avant -i pour rapidité)
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
  for (const p of [path.join(root, '.env.local'), path.join(root, '.env'), 'F:\\Brams-Score-By-Freydiss\\brams-website\\.env']) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}

const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev' } = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
  throw new Error('Missing R2 env vars')

const TEMP = path.join(os.tmpdir(), 'brams-thumbs')

const JOBS = [
  {
    name: 'Kaiju No. 8',
    dir: 'F:\\Brams-Score-By-Freydiss\\brams-website\\public\\anime\\Kaiju No 8 S01 MULTi 1080p WEB x264 AAC -Tsundere-Raws (CR)',
    filter: f => /\.mkv$/i.test(f),
    epNum: f => { const m = f.match(/S01E(\d+)/i); return m ? parseInt(m[1]) : null },
    key: ep => `anime/kaiju-no-8-thumbnails/S01E${String(ep).padStart(2,'0')}.jpg`,
    jsonPath: path.join(root, 'src', 'data', 'kaiju-videos.json'),
    thumbUrl: ep => `${R2_PUBLIC_URL}/anime/kaiju-no-8-thumbnails/S01E${String(ep).padStart(2,'0')}.jpg`,
  },
  {
    name: "Vivy: Fluorite Eye's Song",
    dir: "F:\\Brams-Score-By-Freydiss-new\\public\\anime\\[sekkusu&ok] Vivy -Fluorite Eye's Song- - [Multi-Subs + VOSTFR] [1080p]",
    filter: f => /\.mkv$/i.test(f),
    epNum: f => { const m = f.match(/- (\d+) \[/); return m ? parseInt(m[1]) : null },
    key: ep => `anime/vivy-thumbnails/Ep${String(ep).padStart(2,'0')}.jpg`,
    jsonPath: path.join(root, 'src', 'data', 'vivy-videos.json'),
    thumbUrl: ep => `${R2_PUBLIC_URL}/anime/vivy-thumbnails/Ep${String(ep).padStart(2,'0')}.jpg`,
  },
]

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'ignore' })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)))
  })
}

async function exists(key) {
  try { await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true }
  catch { return false }
}

async function upload(localPath, key) {
  const up = new Upload({
    client,
    params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(localPath), ContentType: 'image/jpeg' },
    queueSize: 2, partSize: 5 * 1024 * 1024,
  })
  await up.done()
}

async function processJob(job) {
  console.log(`\n=== ${job.name} ===`)
  if (!fs.existsSync(job.dir)) { console.log(`  Source introuvable: ${job.dir}`); return }

  const files = fs.readdirSync(job.dir).filter(job.filter).sort()
  const videos = JSON.parse(fs.readFileSync(job.jsonPath, 'utf8'))
  let changed = false

  for (const filename of files) {
    const ep = job.epNum(filename)
    if (!ep) continue
    const key  = job.key(ep)
    const tmp  = path.join(TEMP, `thumb_${Date.now()}.jpg`)
    const src  = path.join(job.dir, filename)

    if (await exists(key)) {
      process.stdout.write(`  Ep${ep}: déjà sur R2\n`)
    } else {
      process.stdout.write(`  Ep${ep}: extraction...`)
      await run('ffmpeg', [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-ss', '00:01:30',         // seek rapide avant -i
        '-i', src,
        '-vframes', '1',
        '-vf', 'scale=480:270',
        '-q:v', '4',               // ~25-40KB par image
        tmp,
      ])
      await upload(tmp, key)
      fs.unlinkSync(tmp)
      process.stdout.write(` ✓ uploadé\n`)
    }

    // Mise à jour JSON
    const vidEntry = videos.find(v => v.episode === ep)
    if (vidEntry && vidEntry.thumbnail !== job.thumbUrl(ep)) {
      vidEntry.thumbnail = job.thumbUrl(ep)
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(job.jsonPath, JSON.stringify(videos, null, 2), 'utf8')
    console.log(`  ✓ JSON mis à jour`)
  }
}

async function main() {
  fs.mkdirSync(TEMP, { recursive: true })
  for (const job of JOBS) await processJob(job)
  console.log('\n=== DONE ===')
}

main().catch(err => { console.error(err); process.exit(1) })
