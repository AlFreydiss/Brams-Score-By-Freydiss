/**
 * Régénère UNIQUEMENT les segments d'init fmp4 manquants (video_init.mp4,
 * audio-fr_init.mp4, audio-ja_init.mp4) pour les épisodes MHA.
 *
 * Bug d'origine : le build passait `-hls_fmp4_init_filename 'video_init.mp4'`
 * (nom nu) → ffmpeg écrivait l'init dans le CWD, jamais dans outDir → jamais
 * uploadé. Les .m4s (chemin complet) étaient bien là → flux illisible (init manquant).
 *
 * On ré-encode 2s avec les MÊMES params → l'init produit est compatible avec les
 * .m4s déjà en ligne (mêmes SPS/PPS/timescale). On uploade seulement les *_init.mp4.
 * Idempotent : skip si video_init.mp4 déjà présent. ONLY=S04E001 pour cibler un test.
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
  for (const p of [path.join(root, '.env'), path.join(root, '.env.local'), 'F:\\Brams-Score-By-Freydiss\\brams-website\\.env']) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}
const E = loadEnv()
const ONLY = (E.ONLY || '').toUpperCase()
const MHA_BASE = 'F:\\Brams-Score-By-Freydiss-new\\public\\anime'
const KEY_PREFIX = 'anime/mha-hls'
const SEASON_DIRS = {
  S01: 'My Hero Academia S01 (2016) MULTi 1080p 10bits BluRay x265 AAC v2 -Punisher694',
  S02: 'My Hero Academia S02 (2017) MULTi 1080p 10bits BluRay x265 AAC v2 -Punisher694',
  S03: 'My Hero Academia S03 (2018) MULTi 1080p 10bits BluRay x265 AAC -Punisher694',
  S04: 'My Hero Academia S04 (2019) MULTi 1080p 10bits BluRay x265 AAC -Punisher694',
  S05: 'My Hero Academia S05 (2021) MULTi 1080p 10bits BluRay x265 AAC -Punisher694',
  S06: 'My Hero Academia S06 (2022) MULTi 1080p 10bits BluRay x265 AAC -Punisher694',
}
const client = new S3Client({
  region: 'auto', endpoint: `https://${E.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: E.R2_ACCESS_KEY_ID, secretAccessKey: E.R2_SECRET_ACCESS_KEY },
})
const BUCKET = E.R2_BUCKET_NAME

function run(args, cwd) {
  return new Promise((resolve, reject) => {
    const c = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'], cwd })
    let err = ''
    c.stderr.on('data', d => { err += d })
    c.on('error', reject)
    c.on('close', code => code === 0 ? resolve() : reject(new Error(err.slice(-500))))
  })
}
async function exists(key) {
  try { await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true } catch { return false }
}
async function put(key, file) {
  await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: fs.readFileSync(file), ContentType: 'video/mp4' }))
}

// Init-only : mêmes params que le build, mais -t 2 (l'init est écrit au démarrage).
function videoArgs(src, out) {
  return ['-y', '-hide_banner', '-loglevel', 'error', '-t', '2', '-i', src, '-map', '0:v:0',
    '-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '20', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-an',
    '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', 'video_init.mp4', '-hls_segment_filename', 'video_%05d.m4s', 'video.m3u8']
}
function audioArgs(src, streamIdx, name) {
  return ['-y', '-hide_banner', '-loglevel', 'error', '-t', '2', '-i', src, '-map', `0:a:${streamIdx}`, '-c:a', 'copy', '-vn',
    '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', `${name}_init.mp4`, '-hls_segment_filename', `${name}_%05d.m4s`, `${name}.m3u8`]
}

async function main() {
  let ok = 0, skip = 0, fail = 0
  for (const [season, dirName] of Object.entries(SEASON_DIRS)) {
    const dir = path.join(MHA_BASE, dirName)
    if (!fs.existsSync(dir)) { console.log(`⚠ ${season} introuvable`); continue }
    const files = fs.readdirSync(dir).filter(f => /\.mkv$/i.test(f)).sort()
    for (const filename of files) {
      const m = filename.match(/S\d+E(\d+)/i); if (!m) continue
      const ep = parseInt(m[1], 10)
      const r2Key = `${season}E${String(ep).padStart(3, '0')}`
      if (ONLY && r2Key !== ONLY) continue
      const initKey = `${KEY_PREFIX}/${r2Key}/video_init.mp4`
      if (await exists(initKey)) { skip++; continue }
      const src = path.join(dir, filename)
      const outDir = path.join(os.tmpdir(), 'mha-init', r2Key)
      fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true })
      try {
        await run(videoArgs(src, outDir), outDir)
        await run(audioArgs(src, 0, 'audio-fr'), outDir)
        await run(audioArgs(src, 1, 'audio-ja'), outDir)
        for (const f of ['video_init.mp4', 'audio-fr_init.mp4', 'audio-ja_init.mp4']) {
          const fp = path.join(outDir, f)
          if (!fs.existsSync(fp)) throw new Error(`init absent: ${f}`)
          await put(`${KEY_PREFIX}/${r2Key}/${f}`, fp)
        }
        ok++; console.log(`✓ ${r2Key} (inits uploadés)`)
      } catch (e) {
        fail++; console.error(`✗ ${r2Key}: ${e.message}`)
      } finally {
        fs.rmSync(outDir, { recursive: true, force: true })
      }
    }
  }
  console.log(JSON.stringify({ ok, skip, fail }))
}
main().catch(e => { console.error(e); process.exit(1) })
