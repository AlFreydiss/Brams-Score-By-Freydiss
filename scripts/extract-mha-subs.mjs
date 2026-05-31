/**
 * Extrait les sous-titres FR (piste "Full") des MKV MHA → WebVTT → R2, et
 * renseigne `subtitles` dans src/data/mha-videos.json (comme Violet/Vivy).
 * Sélection robuste : piste sous-titre FR dont le titre contient "full"
 * (sinon dernière piste FR, sinon 1re sous-titre). Idempotent (skip si .vtt déjà là).
 * ONLY=S04E001 pour cibler un test.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync, spawnSync } from 'child_process'
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
const PUB = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
const MHA_BASE = 'F:\\Brams-Score-By-Freydiss-new\\public\\anime'
const KEY_PREFIX = 'anime/mha-hls'
const JSON_PATH = path.join(root, 'src', 'data', 'mha-videos.json')
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

async function exists(key) {
  try { await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true } catch { return false }
}

// Choisit l'index sous-titre relatif (0:s:N) : FR "full" en priorité.
function pickSubIndex(src) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 's',
    '-show_entries', 'stream=index:stream_tags=language,title', '-of', 'json', src], { encoding: 'utf8' })
  const streams = JSON.parse(out).streams || []
  if (!streams.length) return -1
  const fr = streams.filter(s => (s.tags?.language || '').toLowerCase().startsWith('fr'))
  const pool = fr.length ? fr : streams
  const full = pool.find(s => /full/i.test(s.tags?.title || ''))
  const chosen = full || pool[pool.length - 1] || streams[0]
  // index relatif aux pistes sous-titre (ordre = ordre dans `streams`)
  return streams.findIndex(s => s.index === chosen.index)
}

const videos = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))
const byKey = new Map(videos.map(v => [`${v.season}E${String(v.episode).padStart(3, '0')}`, v]))

async function main() {
  let ok = 0, skip = 0, fail = 0
  for (const [season, dirName] of Object.entries(SEASON_DIRS)) {
    const dir = path.join(MHA_BASE, dirName)
    if (!fs.existsSync(dir)) { console.log(`⚠ ${season} introuvable`); continue }
    for (const filename of fs.readdirSync(dir).filter(f => /\.mkv$/i.test(f)).sort()) {
      const m = filename.match(/S\d+E(\d+)/i); if (!m) continue
      const r2Key = `${season}E${String(parseInt(m[1], 10)).padStart(3, '0')}`
      if (ONLY && r2Key !== ONLY) continue
      const ep = byKey.get(r2Key); if (!ep) continue
      const subKey = `${KEY_PREFIX}/${r2Key}/sub-fr.vtt`
      const subUrl = `${PUB}/${subKey}`
      const attach = () => { ep.subtitles = [{ label: 'Français', srclang: 'fr', src: subUrl }]; ep.defaultSubtitlesOff = true }
      if (await exists(subKey)) { attach(); skip++; continue }
      const src = path.join(dir, filename)
      const tmp = path.join(os.tmpdir(), `mha-sub-${r2Key}.vtt`)
      try {
        const sIdx = pickSubIndex(src)
        if (sIdx < 0) { console.log(`· ${r2Key} : aucune piste sous-titre`); fail++; continue }
        const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src,
          '-map', `0:s:${sIdx}`, '-c:s', 'webvtt', tmp], { encoding: 'utf8' })
        if (r.status !== 0 || !fs.existsSync(tmp) || fs.statSync(tmp).size < 40) throw new Error(r.stderr?.slice(-300) || 'vtt vide')
        await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: subKey,
          Body: fs.readFileSync(tmp), ContentType: 'text/vtt; charset=utf-8' }))
        attach(); ok++; console.log(`✓ ${r2Key} (sub-fr.vtt, s:${sIdx})`)
      } catch (e) {
        fail++; console.error(`✗ ${r2Key}: ${e.message}`)
      } finally {
        fs.rmSync(tmp, { force: true })
      }
    }
  }
  fs.writeFileSync(JSON_PATH, JSON.stringify(videos, null, 2) + '\n')
  console.log(JSON.stringify({ ok, skip, fail }))
}
main().catch(e => { console.error(e); process.exit(1) })
