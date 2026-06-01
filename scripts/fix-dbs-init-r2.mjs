/**
 * Répare les épisodes DBS HLS fMP4 (S01E001-059) : leurs segments .m4s sont bien
 * sur R2, mais les segments d'INITIALISATION (video_init.mp4, audio-fr_init.mp4,
 * audio-ja_init.mp4) manquent → aucun lecteur ne peut décoder (404 sur l'init).
 *
 * On régénère uniquement ces init à partir des MKV source (en ne traitant que les
 * premières secondes : l'init est déterministe en -c copy, donc compatible avec
 * les segments déjà uploadés), puis on les upload. Aucun re-upload des segments.
 *
 * Usage : node scripts/fix-dbs-init-r2.mjs            (ep 1-59)
 *         DBS_START=1 DBS_END=1 node scripts/fix-dbs-init-r2.mjs   (test)
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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

const env = loadEnv()
const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env
if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new Error('Missing R2 env vars')

const FFMPEG = env.FFMPEG_PATH && fs.existsSync(env.FFMPEG_PATH) ? env.FFMPEG_PATH : 'ffmpeg'
const SRC_DIR = 'F:\\Brams-Score-By-Freydiss\\brams-website\\public\\anime\\Dragon Ball Super S01 MULTi 1080p WEB x264 AAC -Tsundere-Raws (ADN)'
const PREFIX = 'anime/dbs-hls'
const TEMP = path.join(os.tmpdir(), 'brams-dbs-init')
const START = parseInt(env.DBS_START || '1', 10)
const END = parseInt(env.DBS_END || '59', 10)

const client = new S3Client({ region: 'auto', endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } })

// cwd important : ce build de ffmpeg écrit -hls_fmp4_init_filename RELATIF au CWD,
// pas au dossier de la playlist. On lance donc ffmpeg dans outDir.
function run(args, cwd) {
  return new Promise((resolve, reject) => {
    const c = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'], cwd })
    let err = ''; c.stderr.on('data', d => { err += d })
    c.on('error', reject)
    c.on('close', code => code === 0 ? resolve() : reject(new Error(err.slice(-400) || `ffmpeg ${code}`)))
  })
}
async function exists(key) { try { await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true } catch { return false } }
async function put(localPath, key) {
  await client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: fs.readFileSync(localPath), ContentType: 'video/mp4' }))
}

// Produit l'init (+ un mini segment jetable) pour un flux donné, en ne lisant que
// les premières secondes de la source. L'init est ensuite uploadé seul.
// NB : le nom de la playlist NE DOIT PAS contenir « .mp4 » sinon ffmpeg n'écrit pas
// le fichier d'init (constaté). On utilise un tag court et propre par flux.
async function buildInit(srcFile, outDir, map, initName, tag) {
  // Chemins de sortie en NOMS SIMPLES (relatifs) + cwd=outDir : l'init relatif
  // tombe alors bien dans outDir.
  await run(['-y', '-hide_banner', '-loglevel', 'error', '-t', '4', '-i', srcFile,
    '-map', map, '-c', 'copy', map.includes(':v') ? '-an' : '-vn',
    '-f', 'hls', '-hls_time', '20', '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', initName,
    '-hls_segment_filename', `${tag}_%05d.m4s`,
    `${tag}.m3u8`], outDir)
}

const mkvForEp = (() => {
  const files = fs.readdirSync(SRC_DIR).filter(f => /\.mkv$/i.test(f))
  const map = {}
  for (const f of files) { const m = f.match(/S01E(\d{1,3})/i); if (m) map[parseInt(m[1])] = path.join(SRC_DIR, f) }
  return map
})()

async function main() {
  fs.mkdirSync(TEMP, { recursive: true })
  let fixed = 0, skipped = 0, missing = 0
  for (let ep = START; ep <= END; ep++) {
    const id = `S01E${String(ep).padStart(3, '0')}`
    const vinitKey = `${PREFIX}/${id}/video_init.mp4`
    if (await exists(vinitKey)) { console.log(`  ${id}: init déjà présent → skip`); skipped++; continue }
    const src = mkvForEp[ep]
    if (!src) { console.log(`  ${id}: MKV source introuvable`); missing++; continue }
    const outDir = path.join(TEMP, id); fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true })
    try {
      process.stdout.write(`  ${id}: génération init...`)
      await buildInit(src, outDir, '0:v:0', 'video_init.mp4', 'v')
      await buildInit(src, outDir, '0:a:0', 'audio-fr_init.mp4', 'afr')
      await buildInit(src, outDir, '0:a:1', 'audio-ja_init.mp4', 'aja')
      let up = 0
      for (const init of ['video_init.mp4', 'audio-fr_init.mp4', 'audio-ja_init.mp4']) {
        const lp = path.join(outDir, init)
        if (fs.existsSync(lp)) { await put(lp, `${PREFIX}/${id}/${init}`); up++ }
        else process.stdout.write(`\n    ⚠ ${init} absent du build (${fs.readdirSync(outDir).join(',')})`)
      }
      process.stdout.write(` ✓ ${up}/3 uploadés\n`)
      fixed++
    } catch (e) { console.log(` ÉCHEC ${e.message}`) }
    finally { fs.rmSync(outDir, { recursive: true, force: true }) }
  }
  console.log(`\n=== ${fixed} réparés, ${skipped} déjà ok, ${missing} sans source ===`)
}
main().catch(e => { console.error(e); process.exit(1) })
