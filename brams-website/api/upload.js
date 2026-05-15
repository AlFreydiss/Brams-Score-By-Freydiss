import { handleUpload } from '@vercel/blob/server'

const ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'text/vtt',
  'text/plain', // .vtt files sometimes come as text/plain
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const secret = process.env.UPLOAD_SECRET
  if (secret) {
    const auth = req.headers['x-upload-secret']
    if (auth !== secret) return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: 2 * 1024 * 1024 * 1024, // 2 GB
          tokenPayload: pathname,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload terminé:', blob.pathname, blob.url)
      },
    })
    return res.status(200).json(jsonResponse)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
}
