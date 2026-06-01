// Génère une miniature par épisode MHA en capturant une frame du flux HLS
// déjà en ligne, l'uploade sur R2 (bucket R2_BUCKET_NAME, celui des .m3u8),
// VÉRIFIE en HTTP réel que l'objet répond 200 sur l'URL publique, puis écrit
// le champ `thumbnail` dans src/data/mha-videos.json uniquement pour les
// miniatures confirmées. Idempotent : les thumbs déjà en ligne sont réutilisés.

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// --- env (même méthode que build-upload-mha-hls-r2.mjs, pas de dotenv) ---
function loadEnv() {
  const env = { ...process.env }
  for (const p of [path.join(root, '.env'), path.join(root, '.env.local')]) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
  }
  return env
}
const E = loadEnv()
const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev' } = E
if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
  throw new Error('Missing R2 env vars')

const PUB = R2_PUBLIC_URL.replace(/\/$/, '')
const HLS_PREFIX = 'anime/mha-hls'
const jsonPath = path.join(root, 'src', 'data', 'mha-videos.json')
const reportPath = path.join(__dirname, 'gen-mha-thumbs-report.json')
const progPath = path.join(__dirname, 'gen-mha-thumbs-progress.txt')

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

async function head(url) {
  try { return (await fetch(url, { method: 'HEAD' })).status } catch { return 0 }
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8').replace(/^﻿/, ''))
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mha-thumb-'))
  const SEEKS = ['90', '45', '15']
  const report = { bucket: R2_BUCKET_NAME, total: data.length, ok: 0, skipped: 0, fail: 0, failed: [] }
  let n = 0
  const writeProg = () => fs.writeFileSync(progPath, `n=${n}/${data.length} ok=${report.ok} skip=${report.skipped} fail=${report.fail}`)

  for (const ep of data) {
    const key = `${ep.season}E${String(ep.episode).padStart(3, '0')}`
    const thumbKey = `${HLS_PREFIX}/${key}/thumb.jpg`
    const thumbUrl = `${PUB}/${thumbKey}`
    const master = `${PUB}/${HLS_PREFIX}/${key}/master.m3u8`

    if ((await head(thumbUrl)) === 200) {
      ep.thumbnail = thumbUrl; report.skipped++; n++; writeProg(); continue
    }

    let success = false
    for (const ss of SEEKS) {
      const out = path.join(tmp, `${key}.jpg`)
      try {
        execSync(
          `ffmpeg -y -ss ${ss} -i "${master}" -frames:v 1 -an -vf "scale=480:-2" -q:v 4 "${out}"`,
          { stdio: 'ignore', timeout: 120000 }
        )
        if (!fs.existsSync(out)) continue
        const body = fs.readFileSync(out)
        if (body.length < 1500) continue
        await client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME, Key: thumbKey, Body: body, ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        }))
        let verified = false
        for (let i = 0; i < 4; i++) {
          if ((await head(thumbUrl)) === 200) { verified = true; break }
          await sleep(1200)
        }
        if (verified) { ep.thumbnail = thumbUrl; success = true; break }
      } catch {}
    }
    if (success) report.ok++; else { report.fail++; report.failed.push(key) }
    n++; if (n % 3 === 0) writeProg()
  }

  fs.rmSync(tmp, { recursive: true, force: true })
  if (report.ok > 0 || report.skipped > 0) fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  fs.writeFileSync(progPath, `COMPLETE n=${n}/${data.length} ok=${report.ok} skip=${report.skipped} fail=${report.fail} failed=${report.failed.join(',')}`)
  console.log(JSON.stringify({ bucket: R2_BUCKET_NAME, ok: report.ok, skipped: report.skipped, fail: report.fail }))
}

main().catch(e => {
  fs.writeFileSync(reportPath, JSON.stringify({ error: String(e && e.stack || e) }, null, 2))
  console.error(e)
  process.exit(1)
})
