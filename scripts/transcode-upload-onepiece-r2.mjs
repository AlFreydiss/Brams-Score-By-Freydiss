/**
 * One Piece Egghead — MKV x265 VOSTFR → MP4 H264 via NVENC (GPU)
 * Episodes E1086-E1163
 * Subtitles VTT déjà sur R2, pas besoin de les re-uploader.
 * Met à jour src/data/onepiece-videos.js avec les nouveaux chemins .mp4
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
  OP_START = '', OP_END = '' } = loadEnv()

if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
  throw new Error('Missing R2 env vars')

const SOURCE_DIR = 'F:\\Brams-Score-By-Freydiss\\brams-website\\public\\anime\\One.Piece.Arc.Egghead.E1086-1155.VOSTFR.1080p.WEBRiP.x265-KAF'
const KEY_PREFIX  = 'anime/op-egghead'
const TEMP = path.join(os.tmpdir(), 'brams-onepiece')
const EP_START = OP_START ? parseInt(OP_START) : 1086
const EP_END   = OP_END   ? parseInt(OP_END)   : 1163

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { process.stderr.write(chunk); stderr += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)))
  })
}

async function exists(key) {
  try { await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true }
  catch { return false }
}

async function upload(localPath, key, contentType = 'video/mp4') {
  const size = fs.statSync(localPath).size
  const up = new Upload({
    client,
    params: { Bucket: R2_BUCKET_NAME, Key: key, Body: fs.createReadStream(localPath), ContentType: contentType },
    queueSize: 4, partSize: 10 * 1024 * 1024,
  })
  let last = -1
  up.on('httpUploadProgress', p => {
    const pct = Math.min(100, Math.round((p.loaded / size) * 100))
    if (pct !== last) { process.stdout.write(`\r  Upload ${key}: ${pct}%  `); last = pct }
  })
  await up.done()
  console.log()
}

// Même map de titres que dans onepiece-videos.js
const EPISODE_TITLES = {
  1086:'Un nouvel empereur ! Baggy le clown aux mille pieces !',
  1087:"La guerre sur l'ile des femmes ! L'affaire de Kobby le heros",
  1088:'Le reve de Luffy',
  1089:'Un nouveau chapitre commence ! Les routes de Luffy et Sabo',
  1090:'Une nouvelle ile ! Egghead, ile du futur',
  1091:"Plein de futur ! Aventure sur l'ile de la science",
  1092:'Les lamentations de Bonney ! Une ombre plane sur Egghead',
  1093:'Le vainqueur rafle tout ! Law contre Barbe Noire',
  1094:"Le mystere s'epaissit ! La Labophase d'Egghead",
  1095:'Le cerveau du genie ! Les six Vegapunk',
  1096:"Une histoire interdite ! La theorie d'un royaume",
  1097:"La volonte d'Ohara ! Les recherches heritees",
  1098:"Le reve excentrique d'un genie !",
  1099:"Preparatifs d'interception ! Rob Lucci attaque",
  1100:'Une puissance sans precedent ! Luffy contre Lucci',
  1101:"La forme ultime de l'humanite ! Les pouvoirs des Seraphim",
  1102:"Manigances sinistres ! L'operation d'evasion d'Egghead",
  1103:'Rends-moi mon pere ! Le voeu fragile de Bonney',
  1104:"Situation desesperee ! L'attaque totale des Seraphim",
  1105:'Une magnifique trahison ! Stussy, la taupe',
  1106:'Incident anormal ! Cherchez le Dr Vegapunk',
  1107:'Frisson ! Une main malefique rampe vers le laboratoire',
  1108:'Incomprehensible ! La rebellion des Seraphim',
  1109:'Une decision difficile ! Une alliance inattendue',
  1110:"Survivre ! Combat mortel contre la forme ultime de l'humanite",
  1111:"Le second Ohara ! L'ambition du cerveau de l'ombre",
  1112:'Collision ! Shanks contre Eustass Kid',
  1113:'Cours, Kobby ! Une strategie de fuite desesperee',
  1114:"Pour son eleve adore ! Le poing du vice-amiral Garp",
  1115:"La Marine stupefaite ! Kuzan, l'ancien amiral",
  1116:"Allons le chercher ! La grande declaration de Baggy",
  1117:'Le retour de Sabo ! La verite choquante a raconter',
  1118:"Tumulte en Terre Sainte ! Le coup de toutes les forces de Sai et Leo",
  1119:'Le message confie ! La resolution du roi Cobra',
  1120:"Le monde vacille ! Le jugement du souverain et l'action des Cinq Doyens",
  1121:'Garp et Kuzan ! Le choc des justices entre maitre et eleve',
  1122:'La derniere lecon ! Un Impact herite',
  1123:'Le monde tremble ! Les Mugiwara prennent Vegapunk en otage',
  1124:"Completement encercles ! L'operation d'evasion d'Egghead",
  1125:"Deux volontes s'affrontent ! Kizaru et Sentomaru",
  1126:"Le desespoir approche ! La mission deprimante de l'amiral Kizaru",
  1127:'Luffy contre Kizaru ! Un combat kaleidoscopique feroce',
  1128:'Le cauchemar frappe ! Saturn, dieu guerrier de la science',
  1129:'Le passe de Kuma ! Un monde ou il vaut mieux mourir',
  1130:'Une histoire effacee ! Le desespoir de God Valley',
  1131:'Un bref instant de bonheur ! Kumachi et Ginny',
  1132:'Une promesse a Ginny ! Kuma devient pere',
  1133:'Sauver sa fille ! Kuma, le pacifiste timide',
  1134:'Destin cruel ! La decision de Kuma en tant que pere',
  1135:'Vers la mer ou se trouve mon pere ! Le futur choisi par Bonney',
  1136:'La vie de Kuma',
  1137:'Pardon papa ! Les larmes de Bonney et le poing de Kuma',
  1138:"Merci papa ! L'etreinte chaleureuse de Bonney et Kuma",
  1139:'Detruisez Egghead ! Le Buster Call est lance',
  1140:'Le heros admire ! Le guerrier de la liberation qui sauve Bonney',
  1141:'Des renforts fiables ! Dorry et Brogy arrivent',
  1142:'Repondez, le monde ! Le message de Vegapunk',
  1143:'Le plan secret de Vegapunk ! Une diffusion mondiale sous tension',
  1144:'Le pire cauchemar ! Les Cinq Doyens se rassemblent',
  1145:"Combattre avec des amis ! Luffy et les guerriers d'Elbaph",
  1146:"Menace imminente ! La determination de Stussy et d'Edison",
  1147:'Conclusion stupefiante ! La grande prediction de Vegapunk',
  1148:'Histoire perdue ! Joy Boy, le premier pirate',
  1149:"Le siecle oublie ! Revelation sur un monde englouti",
  1150:'Faites bouger le navire ! Le geant de fer se reveille',
  1151:'Son reve et celui de son pere ! Le futur libre de Bonney',
  1152:"L'heritage de son pere et de sa mere ! Le Nika Punch de Bonney",
  1153:"Le bouleversement d'une ere ! Le fluide royal qui guide Luffy",
  1154:'La verite derriere le plan secret ! Vegapunk declare victoire',
  1155:"L'horizon promis ! En route vers Elbaph tant attendu",
  1163:'Episode 1163',
}

const SUBTITLE_BASE = `${R2_PUBLIC_URL}/anime/op-egghead-subtitles`
const THUMB_BASE    = `${R2_PUBLIC_URL}/anime/op-egghead-thumbnails`

// Fichiers source locaux
const SPECIAL_SRC = {
  1120: 'One.Piece.E1120.v2.VOSTFR.1080p.WEBRiP.x265-KAF.mkv',
  1163: 'F:\\Brams-Score-By-Freydiss\\brams-website\\public\\anime\\[KiyoshiiSubs] One Piece - 1163 [1080p][H.265 - 10Bit].mkv',
}
function srcPathFor(ep) {
  const filename = SPECIAL_SRC[ep] || `One.Piece.E${ep}.VOSTFR.1080p.WEBRiP.x265-KAF.mkv`
  return path.isAbsolute(filename) ? filename : path.join(SOURCE_DIR, filename)
}

async function main() {
  fs.mkdirSync(TEMP, { recursive: true })
  console.log(`\n=== One Piece Egghead — E${EP_START}-E${EP_END} ===\n`)

  for (let ep = EP_START; ep <= EP_END; ep++) {
    const srcPath  = srcPathFor(ep)
    const filename = path.basename(srcPath)
    const key      = `${KEY_PREFIX}/E${ep}.mp4`
    const thumbKey = `anime/op-egghead-thumbnails/E${ep}.jpg`
    const tmpMp4   = path.join(TEMP, `E${ep}.mp4`)
    const tmpThumb = path.join(TEMP, `E${ep}.jpg`)

    if (!fs.existsSync(srcPath)) {
      console.log(`[E${ep}] Source manquante: ${filename}, skip.`)
      continue
    }

    console.log(`[E${ep}] ${filename}`)

    if (await exists(key)) {
      console.log('  MP4 déjà sur R2, skip.')
      continue
    }

    console.log('  Transcode x265→x264 NVENC...')
    try {
      await run('ffmpeg', [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-i', srcPath,
        '-map', '0:v:0',
        '-map', '0:a:0',
        '-c:v', 'h264_nvenc',
        '-preset', 'p4',
        '-cq', '21',
        '-profile:v', 'high',
        '-level', '4.1',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        tmpMp4,
      ])
    } catch (err) {
      // Fallback CPU si NVENC échoue
      console.log(`  ⚠ NVENC failed, fallback CPU libx264...`)
      await run('ffmpeg', [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-i', srcPath,
        '-map', '0:v:0',
        '-map', '0:a:0',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '21',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        tmpMp4,
      ])
    }

    if (!(await exists(thumbKey))) {
      console.log('  Génération miniature...')
      await run('ffmpeg', [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-ss', '00:08:00',
        '-i', srcPath,
        '-frames:v', '1',
        '-vf', 'scale=480:270:force_original_aspect_ratio=increase,crop=480:270',
        '-q:v', '3',
        tmpThumb,
      ])
      await upload(tmpThumb, thumbKey, 'image/jpeg')
      fs.unlinkSync(tmpThumb)
    } else {
      console.log('  Miniature déjà sur R2, skip.')
    }

    const gb = (fs.statSync(tmpMp4).size / 1e9).toFixed(2)
    console.log(`  Upload MP4 (${gb} GB)...`)
    await upload(tmpMp4, key)
    fs.unlinkSync(tmpMp4)
    console.log(`  ✓ E${ep} terminé`)
  }

  // Mise à jour de onepiece-videos.js
  const newContent = `const BASE_PATH = '${R2_PUBLIC_URL}/${KEY_PREFIX}'
const SUBTITLE_BASE_PATH = '${SUBTITLE_BASE}'
const THUMBNAIL_BASE_PATH = '${THUMB_BASE}'

const EPISODE_TITLES = ${JSON.stringify(EPISODE_TITLES, null, 2)}

const EPISODES = [
  ...Array.from({ length: 70 }, (_, index) => 1086 + index),
  1163,
]

export default EPISODES.map((episode) => {
  return {
    episode,
    title: EPISODE_TITLES[episode] || \`Episode \${episode}\`,
    src: \`\${BASE_PATH}/E\${episode}.mp4\`,
    thumbnail: \`\${THUMBNAIL_BASE_PATH}/E\${episode}.jpg\`,
    season: 'Egghead',
    arc: 'Arc Egghead',
    subtitles: episode === 1163 ? [] : [
      {
        label: 'Français',
        srclang: 'fr',
        src: \`\${SUBTITLE_BASE_PATH}/One.Piece.E\${episode}.fr.vtt\`,
      },
    ],
  }
})
`

  const jsPath = path.join(root, 'src', 'data', 'onepiece-videos.js')
  fs.writeFileSync(jsPath, newContent, 'utf8')
  console.log(`\n✓ ${jsPath} mis à jour`)
  console.log('=== DONE ===')
}

main().catch(err => { console.error(err); process.exit(1) })
