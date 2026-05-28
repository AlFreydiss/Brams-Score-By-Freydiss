// Génère une URL présignée pour uploader un fichier directement vers Cloudflare R2.
// Utilisé par BlobUploadPage (/blob-upload). Le client PUT ensuite le fichier sur
// uploadUrl, puis référence publicUrl dans les données.
//
// Variables d'environnement requises (Vercel → Settings → Environment Variables) :
//   R2_ACCOUNT_ID         — ID de compte Cloudflare (pour l'endpoint S3)
//   R2_ACCESS_KEY_ID      — clé d'accès R2 (API Token S3)
//   R2_SECRET_ACCESS_KEY  — secret R2
//   R2_BUCKET             — nom du bucket
//   R2_PUBLIC_BASE        — (optionnel) base publique, défaut pub-…r2.dev
//   R2_UPLOAD_SECRET      — (optionnel) secret partagé pour autoriser l'upload
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ACCOUNT_ID  = process.env.R2_ACCOUNT_ID
const ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID
const SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY
const BUCKET      = process.env.R2_BUCKET
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev').replace(/\/+$/, '')
const UPLOAD_SECRET = process.env.R2_UPLOAD_SECRET || process.env.UPLOAD_SECRET || ''

// Garde les caractères sûrs + slashes (pour les sous-dossiers série/saison)
function sanitizeKey(name) {
  return String(name).replace(/\\/g, '/').split('/').map(seg =>
    seg.replace(/[^a-zA-Z0-9._-]/g, '_')).filter(Boolean).join('/')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !BUCKET) {
    res.status(500).json({ error: 'R2 non configuré — définis R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET dans Vercel.' })
    return
  }
  if (UPLOAD_SECRET && req.headers['x-upload-secret'] !== UPLOAD_SECRET) {
    res.status(403).json({ error: "Secret d'upload invalide." })
    return
  }

  const { filename, contentType, series, size } = req.body || {}
  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'filename requis' })
    return
  }
  // Limite de taille (R2 supporte jusqu'à 5 To en multipart, mais on borne le PUT simple à 5 Go)
  if (size && Number(size) > 5 * 1024 * 1024 * 1024) {
    res.status(400).json({ error: 'Fichier trop volumineux (max 5 Go par fichier)' })
    return
  }

  const folder = series ? sanitizeKey(series) + '/' : ''
  const key = folder + sanitizeKey(filename)

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  })

  try {
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType || 'application/octet-stream' }),
      { expiresIn: 3600 },
    )
    res.status(200).json({ uploadUrl, publicUrl: `${PUBLIC_BASE}/${key}`, key })
  } catch (err) {
    console.error('[r2-presign]', err?.message || err)
    res.status(500).json({ error: err?.message || 'presign_failed' })
  }
}
