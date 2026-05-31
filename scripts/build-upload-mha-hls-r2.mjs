/**
 * MHA — HLS multi-audio rebuild depuis sources x265 MULTi (FR + JP)
 * Transcode vidéo x265 Main10 → H264 via NVENC (GPU), audio copy AAC.
 * Produit master.m3u8 avec EXT-X-MEDIA audio groups (VF + Japonais).
 * Saisons S01-S06 (138 épisodes au total).
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envCandidates = [
  path.join(root, '.env'),
  path.join(root, '.env.local'),
  'F:\\Brams-Score-By-Freydiss\\brams-website\\.env',
]

function loadEnv() {
  const env = { ...process.env }
  for (const p of envCandidates) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}

const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev',
  MHA_START = '', MHA_END = '' } = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
  throw new Error('Missing R2 env vars')

const MHA_BASE  = 'F:\\Brams-Score-By-Freydiss-new\\public\\anime'
const KEY_PREFIX = 'anime/mha-hls'
const TEMP_ROOT  = path.join(os.tmpdir(), 'brams-mha-hls')

const SEASON_DIRS = {
  S01: 'My Hero Academia S01 (2016) MULTi 1080p 10bits BluRay x265 AAC v2 -Punisher694',
  S02: 'My Hero Academia S02 (2017) MULTi 1080p 10bits BluRay x265 AAC v2 -Punisher694',
  S03: 'My Hero Academia S03 (2018) MULTi 1080p 10bits BluRay x265 AAC -Punisher694',
  S04: 'My Hero Academia S04 (2019) MULTi 1080p 10bits BluRay x265 AAC -Punisher694',
  S05: 'My Hero Academia S05 (2021) MULTi 1080p 10bits BluRay x265 AAC -Punisher694',
  S06: 'My Hero Academia S06 (2022) MULTi 1080p 10bits BluRay x265 AAC -Punisher694',
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const CT = {
  '.m3u8': 'application/vnd.apple.mpegurl; charset=utf-8',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
}

function run(cmd, args, label = '') {
  return new Promise((resolve, reject) => {
    if (label) process.stdout.write(`  ${label}...`)
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      if (label) console.log(' ✓')
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-800)}`))
    })
  })
}

async function exists(key) {
  try { await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true }
  catch { return false }
}

async function uploadDir(dir, prefix) {
  const files = fs.readdirSync(dir)
  for (const name of files) {
    const localPath = path.join(dir, name)
    const key = `${prefix}/${name}`
    const ext = path.extname(name).toLowerCase()
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME, Key: key,
      Body: fs.readFileSync(localPath),
      ContentType: CT[ext] || 'application/octet-stream',
    }))
  }
  return files.length
}

function writeMaster(dir, season) {
  fs.writeFileSync(path.join(dir, 'master.m3u8'), [
    '#EXTM3U',
    '#EXT-X-VERSION:7',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="VF",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="fr",URI="audio-fr.m3u8"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Japonais",DEFAULT=NO,AUTOSELECT=YES,LANGUAGE="ja",URI="audio-ja.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=4500000,AVERAGE-BANDWIDTH=3800000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="audio"',
    'video.m3u8',
    '',
  ].join('\n'))
}

async function buildHls(srcPath, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })

  const baseHls = [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_segment_type', 'fmp4',
  ]

  // Vidéo: x265 Main10 → H264 via NVENC (GPU)
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', srcPath,
    '-map', '0:v:0',
    '-c:v', 'h264_nvenc',
    '-preset', 'p4',
    '-cq', '20',
    '-profile:v', 'high',
    '-level', '4.1',
    '-pix_fmt', 'yuv420p',
    '-an',
    ...baseHls,
    '-hls_fmp4_init_filename', 'video_init.mp4',
    '-hls_segment_filename', path.join(outDir, 'video_%05d.m4s'),
    path.join(outDir, 'video.m3u8'),
  ], 'Transcode vidéo NVENC')

  // Audio FR (stream 0:a:0)
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', srcPath,
    '-map', '0:a:0',
    '-c:a', 'copy',
    '-vn',
    ...baseHls,
    '-hls_fmp4_init_filename', 'audio-fr_init.mp4',
    '-hls_segment_filename', path.join(outDir, 'audio-fr_%05d.m4s'),
    path.join(outDir, 'audio-fr.m3u8'),
  ], 'Audio FR')

  // Audio JP (stream 0:a:1)
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', srcPath,
    '-map', '0:a:1',
    '-c:a', 'copy',
    '-vn',
    ...baseHls,
    '-hls_fmp4_init_filename', 'audio-ja_init.mp4',
    '-hls_segment_filename', path.join(outDir, 'audio-ja_%05d.m4s'),
    path.join(outDir, 'audio-ja.m3u8'),
  ], 'Audio JP')

  writeMaster(outDir)
}

async function main() {
  const startEp = MHA_START ? parseInt(MHA_START) : null
  const endEp   = MHA_END   ? parseInt(MHA_END)   : null

  fs.mkdirSync(TEMP_ROOT, { recursive: true })

  for (const [season, dirName] of Object.entries(SEASON_DIRS)) {
    const seasonDir = path.join(MHA_BASE, dirName)
    if (!fs.existsSync(seasonDir)) { console.log(`\n⚠ ${season} non trouvé: ${seasonDir}`); continue }

    const files = fs.readdirSync(seasonDir)
      .filter(f => /\.mkv$/i.test(f))
      .sort()

    console.log(`\n=== ${season} — ${files.length} épisodes ===`)

    for (const filename of files) {
      const m = filename.match(/S\d+E(\d+)/i)
      if (!m) continue
      const ep = parseInt(m[1], 10)
      if (startEp && ep < startEp) continue
      if (endEp   && ep > endEp)   continue

      const epPad = String(ep).padStart(3, '0')
      const r2Key = `${season}E${epPad}`
      const masterKey = `${KEY_PREFIX}/${r2Key}/master.m3u8`

      console.log(`\n[${season}E${epPad}] ${filename}`)

      // Idempotence alignée sur l'audit : on skippe si video.m3u8 est déjà sur R2.
      // (video_init.mp4 n'existe pas sur les anciens builds TS qui marchent
      //  pourtant — l'audit teste video.m3u8, on s'aligne dessus pour ne rebuild
      //  que les épisodes réellement 404.)
      const videoKey = `${KEY_PREFIX}/${r2Key}/video.m3u8`
      if (await exists(videoKey)) {
        console.log('  Déjà sur R2 (video.m3u8 présent), skip.')
        continue
      }

      const srcPath = path.join(seasonDir, filename)
      const outDir  = path.join(TEMP_ROOT, r2Key)

      try {
        await buildHls(srcPath, outDir)

        process.stdout.write('  Upload segments R2...')
        const n = await uploadDir(outDir, `${KEY_PREFIX}/${r2Key}`)
        console.log(` ✓ (${n} fichiers)`)

        fs.rmSync(outDir, { recursive: true, force: true })
        console.log(`  ✓ ${season}E${epPad} terminé`)
      } catch (err) {
        console.error(`\n  ✗ Erreur ${season}E${epPad}: ${err.message}`)
        fs.rmSync(outDir, { recursive: true, force: true })
      }
    }
  }

  console.log('\n=== MHA HLS DONE — JSON déjà correct (multi-audio configuré) ===')
}

main().catch(err => { console.error(err); process.exit(1) })
