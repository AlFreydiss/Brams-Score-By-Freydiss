import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'text/vtt', 'text/plain']
const MAX_SIZE = 4 * 1024 * 1024 * 1024 // 4 GB

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const secret = process.env.UPLOAD_SECRET
  if (secret && req.headers['x-upload-secret'] !== secret) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  const { filename, contentType, series, size } = req.body
  if (!filename || !contentType || !series) {
    return res.status(400).json({ error: 'Paramètres manquants (filename, contentType, series)' })
  }
  if (!ALLOWED_TYPES.includes(contentType)) {
    return res.status(400).json({ error: `Type non autorisé: ${contentType}` })
  }
  if (size && size > MAX_SIZE) {
    return res.status(400).json({ error: 'Fichier trop volumineux (max 4 GB)' })
  }

  const key = `anime/${series}/${filename}`

  const command = new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME,
    Key:         key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(R2, command, { expiresIn: 7200 })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  return res.status(200).json({ uploadUrl, publicUrl, key })
}
