import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const MEDIA_BASE = 'F:\\Brams-Score-By-Freydiss-new\\public\\anime'
const TEMP_ROOT = path.join(os.tmpdir(), 'brams-anime-hls-batch')
const PUBLIC_DEFAULT = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'

function loadEnv() {
  const env = { ...process.env }
  for (const p of [path.join(root, '.env'), path.join(root, '.env.local'), 'F:\\Brams-Score-By-Freydiss\\brams-website\\.env']) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}

const E = loadEnv()
const {
  CF_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = PUBLIC_DEFAULT,
  ANIME_ONLY = '',
  ITEM_ONLY = '',
  FORCE = '',
} = E

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars')
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
  '.vtt': 'text/vtt; charset=utf-8',
  '.jpg': 'image/jpeg',
}

function run(cmd, args, label = '', cwd = undefined) {
  return new Promise((resolve, reject) => {
    if (label) process.stdout.write(`  ${label}...`)
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        if (label) console.log(' ok')
        resolve()
      } else {
        if (label) console.log(' fail')
        reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-1200)}`))
      }
    })
  })
}

function capture(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve(stdout)
      else reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-1200)}`))
    })
  })
}

async function ffprobe(srcPath) {
  const raw = await capture('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', srcPath])
  return JSON.parse(raw)
}

async function exists(key) {
  if (FORCE === '1') return false
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    return true
  } catch {
    return false
  }
}

async function uploadDir(dir, prefix) {
  const names = fs.readdirSync(dir).filter(name => fs.statSync(path.join(dir, name)).isFile())
  let count = 0
  let cursor = 0
  async function worker() {
    while (cursor < names.length) {
      const name = names[cursor++]
      const localPath = path.join(dir, name)
      const ext = path.extname(name).toLowerCase()
      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `${prefix}/${name}`,
        Body: fs.readFileSync(localPath),
        ContentType: CT[ext] || 'application/octet-stream',
      }))
      count += 1
    }
  }
  const workers = Array.from({ length: Math.min(8, names.length) }, () => worker())
  await Promise.all(workers)
  return count
}

async function uploadDirSequential(dir, prefix) {
  const names = fs.readdirSync(dir).filter(name => fs.statSync(path.join(dir, name)).isFile())
  let count = 0
  for (const name of names) {
    const localPath = path.join(dir, name)
    const ext = path.extname(name).toLowerCase()
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `${prefix}/${name}`,
      Body: fs.readFileSync(localPath),
      ContentType: CT[ext] || 'application/octet-stream',
    }))
    count += 1
  }
  return count
}

function pad(n, w = 3) {
  return String(n).padStart(w, '0')
}

function listFiles(dir, regex) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(name => regex.test(name))
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
    .map(name => path.join(dir, name))
}

function normLang(value = '') {
  const v = String(value || '').toLowerCase()
  if (['ja', 'jpn', 'jap', 'jp'].includes(v) || v.includes('japanese') || v.includes('japonais')) return 'ja'
  if (['fr', 'fre', 'fra'].includes(v) || v.includes('french') || v.includes('francais') || v.includes('français') || v.includes('vf')) return 'fr'
  if (['en', 'eng'].includes(v) || v.includes('english') || v.includes('anglais')) return 'en'
  return v
}

function streamLang(stream) {
  return normLang(stream?.tags?.language || stream?.tags?.title || '')
}

function labelForAudio(lang) {
  if (lang === 'fr') return 'VF'
  if (lang === 'ja') return 'Japonais'
  if (lang === 'en') return 'Anglais'
  return lang.toUpperCase()
}

function labelForSubtitle(lang) {
  if (lang === 'fr') return 'Francais'
  if (lang === 'en') return 'English'
  if (lang === 'ja') return 'Japonais'
  return lang.toUpperCase()
}

function isForcedTitle(title = '') {
  return /forced|forc[eé]s/i.test(String(title))
}

function isSignsTitle(title = '') {
  return /signs|songs|dubbing/i.test(String(title))
}

function pickAudioTracks(probe, order) {
  const audioStreams = (probe.streams || []).filter(s => s.codec_type === 'audio')
  const picked = []
  for (const lang of order) {
    const stream = audioStreams.find(s => streamLang(s) === lang)
    if (stream) picked.push({ lang, label: labelForAudio(lang), index: stream.index })
  }
  return picked
}

function pickSubtitleTracks(probe, wanted) {
  const subtitleStreams = (probe.streams || []).filter(s => s.codec_type === 'subtitle')
  const picked = []
  for (const item of wanted) {
    const candidates = subtitleStreams.filter(s => streamLang(s) === item.lang)
    if (!candidates.length) continue
    const full = candidates.find(s => !isForcedTitle(s.tags?.title) && !isSignsTitle(s.tags?.title))
    const fallback = candidates.find(s => !isForcedTitle(s.tags?.title)) || candidates[0]
    const stream = full || fallback
    picked.push({ lang: item.lang, label: item.label || labelForSubtitle(item.lang), index: stream.index })
  }
  return picked
}

function hlsArgs(stem, outDir) {
  return [
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_segment_type', 'fmp4',
    '-hls_flags', 'independent_segments',
    '-hls_fmp4_init_filename', `${stem}_init.mp4`,
    '-hls_segment_filename', path.join(outDir, `${stem}_%05d.m4s`),
    path.join(outDir, `${stem}.m3u8`),
  ]
}

async function buildVideo(srcPath, outDir, codecName) {
  const common = ['-y', '-hide_banner', '-loglevel', 'error', '-i', srcPath, '-map', '0:v:0', '-an', '-sn']
  if (String(codecName).toLowerCase() === 'h264') {
    try {
      await run('ffmpeg', [...common, '-c:v', 'copy', ...hlsArgs('video', outDir)], 'Video copy H264', outDir)
      return
    } catch (err) {
      console.warn(`  H264 copy failed, transcoding instead: ${err.message.split('\n')[0]}`)
    }
  }

  const nvenc = [
    ...common,
    '-c:v', 'h264_nvenc',
    '-preset', 'p4',
    '-cq', '22',
    '-profile:v', 'high',
    '-level', '4.1',
    '-pix_fmt', 'yuv420p',
    ...hlsArgs('video', outDir),
  ]
  try {
    await run('ffmpeg', nvenc, 'Video H264 NVENC', outDir)
    return
  } catch (err) {
    console.warn(`  NVENC failed, falling back to libx264: ${err.message.split('\n')[0]}`)
  }

  await run('ffmpeg', [
    ...common,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '22',
    '-profile:v', 'high',
    '-level', '4.1',
    '-pix_fmt', 'yuv420p',
    ...hlsArgs('video', outDir),
  ], 'Video H264 libx264', outDir)
}

async function buildAudio(srcPath, outDir, track) {
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', srcPath,
    '-map', `0:${track.index}`,
    '-vn', '-sn',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    ...hlsArgs(`audio-${track.lang}`, outDir),
  ], `Audio ${track.label}`, outDir)
}

async function buildSubtitle(srcPath, outDir, track) {
  try {
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', srcPath,
      '-map', `0:${track.index}`,
      '-c:s', 'webvtt',
      path.join(outDir, `sub-${track.lang}.vtt`),
    ], `Sub ${track.label}`, outDir)
    return true
  } catch (err) {
    console.warn(`  Subtitle ${track.label} skipped: ${err.message.split('\n')[0]}`)
    return false
  }
}

async function buildThumb(srcPath, outDir) {
  const out = path.join(outDir, 'thumb.jpg')
  try {
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-ss', '00:02:30',
      '-i', srcPath,
      '-map', '0:v:0',
      '-frames:v', '1',
      '-vf', 'scale=640:-2',
      '-q:v', '4',
      out,
    ], 'Thumbnail')
  } catch {
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-ss', '00:00:20',
      '-i', srcPath,
      '-map', '0:v:0',
      '-frames:v', '1',
      '-vf', 'scale=640:-2',
      '-q:v', '4',
      out,
    ], 'Thumbnail fallback')
  }
}

function writeMaster(outDir, audioTrack) {
  fs.writeFileSync(path.join(outDir, `master-${audioTrack.lang}.m3u8`), [
    '#EXTM3U',
    '#EXT-X-VERSION:7',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="${audioTrack.label}",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="${audioTrack.lang}",URI="audio-${audioTrack.lang}.m3u8"`,
    '#EXT-X-STREAM-INF:BANDWIDTH=4500000,AVERAGE-BANDWIDTH=3800000,CODECS="avc1.640028,mp4a.40.2",AUDIO="audio"',
    'video.m3u8',
    '',
  ].join('\n'))
}

async function buildHls(source, probe, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })

  const video = (probe.streams || []).find(s => s.codec_type === 'video')
  await buildVideo(source.path, outDir, video?.codec_name)
  for (const track of source.audioTracks) await buildAudio(source.path, outDir, track)
  for (const track of source.audioTracks) writeMaster(outDir, track)
  const keptSubs = []
  for (const sub of source.subtitleTracks) {
    if (await buildSubtitle(source.path, outDir, sub)) keptSubs.push(sub)
  }
  source.subtitleTracks = keptSubs
  await buildThumb(source.path, outDir)
}

function fmtDuration(seconds) {
  const total = Math.round(Number(seconds || 0))
  if (!total) return undefined
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function urlFor(key) {
  return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}

function entryFor(catalog, source) {
  const base = `${catalog.keyPrefix}/${source.key}`
  const preferred = source.audioTracks.find(t => t.lang === catalog.preferredAudio) || source.audioTracks[0]
  const masterUrl = urlFor(`${base}/master-${preferred.lang}.m3u8`)
  const entry = {
    episode: source.episode,
    title: source.title,
    src: masterUrl,
    season: source.season,
    arc: source.arc || source.season,
    preferredAudioLang: preferred.lang,
    progressKey: source.progressKey || source.key,
    episodeLabel: source.episodeLabel,
    thumbnail: urlFor(`${base}/thumb.jpg`),
    duration: fmtDuration(source.duration),
    audio: source.audioTracks.map(track => ({
      label: track.label,
      srclang: track.lang,
      mediaSrc: urlFor(`${base}/master-${track.lang}.m3u8`),
      default: track.lang === preferred.lang,
    })),
  }
  if (source.kind) entry.kind = source.kind
  if (source.badge) entry.badge = source.badge
  if (source.subtitleTracks.length) {
    entry.subtitles = source.subtitleTracks.map(track => ({
      label: track.label,
      srclang: track.lang,
      src: urlFor(`${base}/sub-${track.lang}.vtt`),
    }))
  }
  Object.keys(entry).forEach(key => entry[key] === undefined && delete entry[key])
  return entry
}

async function processSource(catalog, source) {
  if (ITEM_ONLY && !source.key.toLowerCase().includes(ITEM_ONLY.toLowerCase())) return null

  console.log(`\n[${catalog.id}/${source.key}] ${path.basename(source.path)}`)
  const probe = await ffprobe(source.path)
  source.duration = probe.format?.duration
  source.audioTracks = pickAudioTracks(probe, catalog.audioOrder)
  source.subtitleTracks = pickSubtitleTracks(probe, catalog.subtitles)

  if (!source.audioTracks.length) throw new Error(`No usable audio track for ${source.path}`)

  const defaultTrack = source.audioTracks.find(t => t.lang === catalog.preferredAudio) || source.audioTracks[0]
  const masterKey = `${catalog.keyPrefix}/${source.key}/master-${defaultTrack.lang}.m3u8`

  if (await exists(masterKey)) {
    console.log('  Already on R2, skip encode.')
    return entryFor(catalog, source)
  }

  const outDir = path.join(TEMP_ROOT, catalog.id, source.key)
  if (fs.existsSync(path.join(outDir, `master-${defaultTrack.lang}.m3u8`))) {
    console.log('  Reusing cached local HLS build.')
  } else {
    await buildHls(source, probe, outDir)
  }

  process.stdout.write('  Upload R2...')
  const count = await uploadDir(outDir, `${catalog.keyPrefix}/${source.key}`)
  console.log(` ok (${count} files)`)

  fs.rmSync(outDir, { recursive: true, force: true })
  return entryFor(catalog, source)
}

function jjkSources() {
  const base = path.join(MEDIA_BASE, 'Jujutsu Kaisen')
  const out = []
  const movie = path.join(base, '[Xspitfire911] Jujutsu Kaisen 0 BDRIP 1080p X265 10bit VOSTFR.mkv')
  if (fs.existsSync(movie)) out.push({
    path: movie,
    key: 'MOVIE',
    episode: 0,
    episodeLabel: 'Film',
    title: 'Jujutsu Kaisen 0',
    season: 'Film',
    arc: 'Film',
    kind: 'film',
    progressKey: 'film-0',
    badge: 'FILM',
  })
  for (const season of ['S01', 'S02']) {
    const dir = path.join(base, `Jujutsu Kaisen ${season}`)
    const offset = season === 'S01' ? 0 : 24
    for (const file of listFiles(dir, /\.mkv$/i)) {
      const ep = Number(path.basename(file).match(/S\d+E(\d+)/i)?.[1] || 0)
      if (!ep) continue
      out.push({
        path: file,
        key: `${season}E${pad(ep)}`,
        episode: offset + ep,
        episodeLabel: `${season}E${pad(ep)}`,
        title: `${season} - Episode ${ep}`,
        season,
        arc: season === 'S01' ? 'Saison 1' : 'Saison 2',
        progressKey: `${season}E${pad(ep)}`,
      })
    }
  }
  return out
}

function aotSources() {
  const s3 = path.join(MEDIA_BASE, "[sekkusu&ok] L'Attaque des titans S3 (Shingeki no Kyojin) - VOSTFR-VF [Multi] [1080p WEB-DL]")
  const s4 = path.join(MEDIA_BASE, '[Tsundere-Raws] Shingeki no Kyojin S4 - BATCH VOSTFR (WKN) [1080p]')
  const out = []
  for (const file of listFiles(s3, /\.mkv$/i)) {
    const ep = Number(path.basename(file).match(/ - (\d+) /)?.[1] || 0)
    if (!ep) continue
    out.push({
      path: file,
      key: `S03E${pad(ep)}`,
      episode: ep,
      episodeLabel: `S03E${pad(ep)}`,
      title: `Saison 3 - Episode ${ep}`,
      season: 'S03',
      arc: 'Saison 3',
      progressKey: `S03E${pad(ep)}`,
    })
  }
  for (const file of listFiles(s4, /\.mp4$/i)) {
    const ep = Number(path.basename(file).match(/ - (\d+) /)?.[1] || 0)
    if (!ep) continue
    out.push({
      path: file,
      key: `S04E${pad(ep)}`,
      episode: 22 + ep,
      episodeLabel: `S04E${pad(ep)}`,
      title: `Saison 4 - Episode ${ep}`,
      season: 'S04',
      arc: 'Saison 4',
      progressKey: `S04E${pad(ep)}`,
    })
  }
  return out
}

function lovePrismSources() {
  const dir = path.join(MEDIA_BASE, 'Love Through A Prism S01 MULTi 1080p WEB AV1 E-AC-3 -Tsundere-Raws (NF)')
  return listFiles(dir, /\.mkv$/i).map(file => {
    const ep = Number(path.basename(file).match(/S01E(\d+)/i)?.[1] || 0)
    return {
      path: file,
      key: `S01E${pad(ep)}`,
      episode: ep,
      episodeLabel: `S01E${pad(ep)}`,
      title: `Episode ${ep}`,
      season: 'S01',
      arc: 'Saison 1',
      progressKey: `S01E${pad(ep)}`,
    }
  }).filter(s => s.episode)
}

function caroleTuesdaySources() {
  const dir = 'F:\\Brams-Score-By-Freydiss-new\\public\\C&T\\[FLAV1N] Carole & Tuesday (BD 1080p 10bit AV1 Opus) [Dual-Audio] [Multi-Subs]'
  return listFiles(dir, /\.mkv$/i).map(file => {
    const ep = Number(path.basename(file).match(/S01E(\d+)/i)?.[1] || 0)
    return {
      path: file,
      key: `S01E${pad(ep)}`,
      episode: ep,
      episodeLabel: `S01E${pad(ep)}`,
      title: `Episode ${ep}`,
      season: 'S01',
      arc: 'Saison 1',
      progressKey: `S01E${pad(ep)}`,
    }
  }).filter(s => s.episode)
}

function violetOvaSources() {
  const file = path.join(MEDIA_BASE, 'Violet Evergarden S01 + OVA (2018) CUSTOM MULTi 1080p 10bits BluRay x265 AAC -Punisher694', 'Violet Evergarden S01E14 (OVA) MULTi 1080p 10bits BluRay x265 AAC -Punisher694.mkv')
  return fs.existsSync(file) ? [{
    path: file,
    key: 'OVA',
    episode: 14,
    episodeLabel: 'OAV',
    title: 'OAV - Violet Evergarden',
    season: 'OVA',
    arc: 'OAV',
    kind: 'ova',
    progressKey: 'ova-14',
    badge: 'OAV',
  }] : []
}

function writeCatalogJson(catalog, entries) {
  const jsonPath = path.join(root, 'src', 'data', catalog.json)
  if (catalog.id === 'violet-ova') {
    const current = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : []
    const clean = current.filter(v => v.kind !== 'ova' && v.progressKey !== 'ova-14')
    const filmIndex = clean.findIndex(v => v.kind === 'film')
    const insertAt = filmIndex >= 0 ? filmIndex : clean.length
    clean.splice(insertAt, 0, ...entries)
    fs.writeFileSync(jsonPath, JSON.stringify(clean, null, 2) + '\n')
    return
  }
  fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2) + '\n')
}

const catalogs = [
  {
    id: 'jjk',
    json: 'jjk-videos.json',
    keyPrefix: 'anime/jjk-hls',
    preferredAudio: 'ja',
    audioOrder: ['ja', 'fr'],
    subtitles: [{ lang: 'fr' }],
    sources: jjkSources,
  },
  {
    id: 'aot',
    json: 'aot-videos.json',
    keyPrefix: 'anime/aot-hls',
    preferredAudio: 'ja',
    audioOrder: ['ja', 'fr'],
    subtitles: [{ lang: 'fr' }],
    sources: aotSources,
  },
  {
    id: 'love-prism',
    json: 'love-prism-videos.json',
    keyPrefix: 'anime/love-prism-hls',
    preferredAudio: 'ja',
    audioOrder: ['ja', 'fr'],
    subtitles: [{ lang: 'fr' }],
    sources: lovePrismSources,
  },
  {
    id: 'carole-tuesday',
    json: 'carole-tuesday-videos.json',
    keyPrefix: 'anime/carole-tuesday-hls',
    preferredAudio: 'ja',
    audioOrder: ['ja'],
    subtitles: [{ lang: 'fr' }, { lang: 'en' }],
    sources: caroleTuesdaySources,
  },
  {
    id: 'violet-ova',
    json: 'violet-evergarden-videos.json',
    keyPrefix: 'anime/violet-evergarden-hls',
    preferredAudio: 'ja',
    audioOrder: ['ja', 'fr'],
    subtitles: [{ lang: 'fr' }],
    sources: violetOvaSources,
  },
]

async function main() {
  fs.mkdirSync(TEMP_ROOT, { recursive: true })
  const only = ANIME_ONLY.trim().toLowerCase()
  for (const catalog of catalogs) {
    if (only && catalog.id !== only) continue
    const sources = catalog.sources()
    console.log(`\n=== ${catalog.id} (${sources.length}) ===`)
    const entries = []
    for (const source of sources) {
      try {
        const entry = await processSource(catalog, source)
        if (entry) entries.push(entry)
      } catch (err) {
        console.error(`  ERROR ${catalog.id}/${source.key}: ${err.message}`)
      }
    }
    if (entries.length) {
      writeCatalogJson(catalog, entries)
      console.log(`  JSON updated: src/data/${catalog.json} (${entries.length})`)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
