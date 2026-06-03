/**
 * Upload des affiches (covers) manquantes sur R2 : Fate/Zero.
 * Usage : node scripts/upload-covers-r2.mjs
 */
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv(){ const e={...process.env}; for(const p of [path.join(root,'.env.local'),path.join(root,'.env')]){ if(!fs.existsSync(p))continue; for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/)){ const m=l.match(/^([^#=]+)=(.*)$/); if(m)e[m[1].trim()]=m[2].trim() } } return e }
const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL='https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev' } = loadEnv()
const client = new S3Client({ region:'auto', endpoint:`https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials:{ accessKeyId:R2_ACCESS_KEY_ID, secretAccessKey:R2_SECRET_ACCESS_KEY } })

const FILES = [
  { local:'F:\\Brams-Score-By-Freydiss-new\\public\\anime\\Fate⁄Zero - iNTEGRALE (2011) VOSTFR 1080p 10bits BluRay x265 AAC v2 -Punisher694\\Cover.png', key:'anime/fate-zero/cover.png', type:'image/png' },
]

for (const f of FILES) {
  if (!fs.existsSync(f.local)) { console.log('absent:', f.local); continue }
  const up = new Upload({ client, params:{ Bucket:R2_BUCKET_NAME, Key:f.key, Body:fs.createReadStream(f.local), ContentType:f.type }, partSize:8*1024*1024 })
  await up.done()
  console.log('✓', `${R2_PUBLIC_URL}/${f.key}`)
}
console.log('=== covers uploadées ===')
