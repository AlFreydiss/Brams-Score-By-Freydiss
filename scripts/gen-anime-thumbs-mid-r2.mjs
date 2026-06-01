/**
 * Miniatures par épisode, extraites AU MILIEU de la vidéo, stockées sur R2.
 *
 * Pour chaque épisode sans `thumbnail` dans son JSON, on lit la durée de la
 * source (ffprobe, sur l'URL R2 directement — mp4 ou HLS .m3u8), on extrait
 * une frame à mi-durée, on l'upload en JPEG 480x270 sur R2, puis on écrit
 * l'URL publique dans le JSON. Idempotent : si l'objet existe déjà sur R2 ou
 * si le JSON a déjà le thumbnail, on saute.
 *
 * Usage : node scripts/gen-anime-thumbs-mid-r2.mjs [tpn|dbs|all]
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
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}

const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev' } = loadEnv()
if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
  throw new Error('Missing R2 env vars (.env.local)')

const TEMP = path.join(os.tmpdir(), 'brams-thumbs-mid')

// id = jeton stable pour nommer le fichier ; on réutilise le SxxExxx de l'URL HLS
// quand il existe (DBS), sinon EpNN basé sur le numéro d'épisode.
const JOBS = {
  tpn: {
    name: 'The Promised Neverland',
    jsonPath: path.join(root, 'src', 'data', 'tpn-videos.json'),
    prefix: 'anime/tpn-thumbnails',
    id: v => `Ep${String(v.episode).padStart(2, '0')}`,
  },
  dbs: {
    name: 'Dragon Ball Super',
    jsonPath: path.join(root, 'src', 'data', 'dbs-videos.json'),
    prefix: 'anime/dbs-thumbnails',
    id: v => (v.src.match(/S\d+E\d+/i)?.[0]) || `Ep${String(v.episode).padStart(3, '0')}`,
  },
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

function run(cmd, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: capture ? ['ignore', 'pipe', 'ignore'] : 'ignore' })
    let out = ''
    if (capture) child.stdout.on('data', d => { out += d })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(`${cmd} exited ${code}`)))
  })
}

async function probeDuration(url) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', url], true)
  const d = parseFloat(out)
  return Number.isFinite(d) && d > 0 ? d : null
}

async function exists(key) {
  try { await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true }
  catch { return false }
}

async function upload(localPath, key) {
  const up = new Upload({ client, params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(localPath), ContentType: 'image/jpeg' }, queueSize: 2, partSize: 5 * 1024 * 1024 })
  await up.done()
}

async function processJob(key, job) {
  console.log(`\n=== ${job.name} ===`)
  const videos = JSON.parse(fs.readFileSync(job.jsonPath, 'utf8'))
  let changed = 0, done = 0
  for (const v of videos) {
    done++
    if (v.thumbnail) continue
    if (!v.src || !/^https?:\/\//.test(v.src)) { console.log(`  Ep${v.episode}: pas de src → skip`); continue }
    const id = job.id(v)
    const r2key = `${job.prefix}/${id}.jpg`
    const url = `${R2_PUBLIC_URL}/${r2key}`
    try {
      if (!(await exists(r2key))) {
        const dur = await probeDuration(v.src)
        const mid = dur ? Math.max(1, Math.floor(dur / 2)) : 90   // fallback 1m30 si durée illisible
        const tmp = path.join(TEMP, `t_${Date.now()}.jpg`)
        process.stdout.write(`  Ep${v.episode}: milieu ${mid}s extraction...`)
        await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(mid), '-i', v.src, '-vframes', '1', '-vf', 'scale=480:270', '-q:v', '4', tmp])
        await upload(tmp, r2key)
        fs.unlinkSync(tmp)
        process.stdout.write(` ✓ (${done}/${videos.length})\n`)
      } else {
        console.log(`  Ep${v.episode}: déjà sur R2 (${done}/${videos.length})`)
      }
      v.thumbnail = url
      changed++
      // Écriture incrémentale : on ne perd pas le travail si le batch est coupé.
      if (changed % 5 === 0) fs.writeFileSync(job.jsonPath, JSON.stringify(videos, null, 2), 'utf8')
    } catch (e) {
      console.log(`  Ep${v.episode}: ÉCHEC ${e.message}`)
    }
  }
  fs.writeFileSync(job.jsonPath, JSON.stringify(videos, null, 2), 'utf8')
  console.log(`  ✓ ${changed} miniatures ajoutées, JSON écrit`)
}

async function main() {
  fs.mkdirSync(TEMP, { recursive: true })
  const arg = (process.argv[2] || 'all').toLowerCase()
  const keys = arg === 'all' ? Object.keys(JOBS) : [arg]
  for (const k of keys) {
    if (!JOBS[k]) { console.log(`Job inconnu: ${k}`); continue }
    await processJob(k, JOBS[k])
  }
  console.log('\n=== DONE ===')
}

main().catch(err => { console.error(err); process.exit(1) })
