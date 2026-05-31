/**
 * Génère un master HLS PAR LANGUE (master-fr.m3u8 / master-ja.m3u8) pour chaque
 * épisode MHA et renseigne `audio[].mediaSrc` dans mha-videos.json.
 *
 * Pourquoi : le switch via hls.audioTrack (un seul master multi-audio) restait
 * "non supporté" dans l'UI. On bascule sur le modèle éprouvé Violet/Vivy : changer
 * de LANGUE = changer de SOURCE (mediaSrc). Chaque master ne déclare qu'une piste
 * audio (DEFAULT=YES) + la même video.m3u8 → aucun re-transcode, juste 2 .m3u8 texte.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
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
const KEY_PREFIX = 'anime/mha-hls'
const JSON_PATH = path.join(root, 'src', 'data', 'mha-videos.json')
const client = new S3Client({
  region: 'auto', endpoint: `https://${E.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: E.R2_ACCESS_KEY_ID, secretAccessKey: E.R2_SECRET_ACCESS_KEY },
})
const BUCKET = E.R2_BUCKET_NAME

// Master mono-langue : 1 seule piste audio en DEFAULT=YES + la video.m3u8 partagée.
function masterFor(audioUri, name, lang) {
  return [
    '#EXTM3U',
    '#EXT-X-VERSION:7',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="${name}",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="${lang}",URI="${audioUri}"`,
    '#EXT-X-STREAM-INF:BANDWIDTH=4500000,AVERAGE-BANDWIDTH=3800000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="audio"',
    'video.m3u8',
    '',
  ].join('\n')
}
async function put(key, body) {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body,
    ContentType: 'application/vnd.apple.mpegurl; charset=utf-8',
  }))
}

const videos = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))

async function main() {
  let ok = 0, fail = 0
  for (const ep of videos) {
    const key = `${ep.season}E${String(ep.episode).padStart(3, '0')}`
    if (ONLY && key !== ONLY) continue
    const base = `${KEY_PREFIX}/${key}`
    const frUrl = `${PUB}/${base}/master-fr.m3u8`
    const jaUrl = `${PUB}/${base}/master-ja.m3u8`
    try {
      await put(`${base}/master-fr.m3u8`, masterFor('audio-fr.m3u8', 'VF', 'fr'))
      await put(`${base}/master-ja.m3u8`, masterFor('audio-ja.m3u8', 'Japonais', 'ja'))
      // Switch de langue = switch de source (mediaSrc), comme Violet/Vivy.
      const subs = ep.subtitles
      ep.src = frUrl
      ep.audio = [
        { label: 'VF', srclang: 'fr', mediaSrc: frUrl, default: true },
        { label: 'Japonais', srclang: 'ja', mediaSrc: jaUrl },
      ]
      if (subs) ep.subtitles = subs
      ok++; console.log(`✓ ${key}`)
    } catch (e) { fail++; console.error(`✗ ${key}: ${e.message}`) }
  }
  fs.writeFileSync(JSON_PATH, JSON.stringify(videos, null, 2) + '\n')
  console.log(JSON.stringify({ ok, fail }))
}
main().catch(e => { console.error(e); process.exit(1) })
