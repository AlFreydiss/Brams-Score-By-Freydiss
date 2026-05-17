import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const ANIME_ROOT = 'F:/Brams-Score-By-Freydiss/brams-website/public/anime'

function serveAnimeFile(req, res, filePath) {
  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.mkv' ? 'video/x-matroska'
    : ext === '.mp4' ? 'video/mp4'
    : ext === '.vtt' ? 'text/vtt'
    : 'application/octet-stream'
  const range = req.headers.range

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': mime,
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
    })
    fs.createReadStream(filePath).pipe(res)
  }
}

const animePlugin = {
  name: 'anime-static',
  configureServer(server) {
    server.middlewares.use('/anime', (req, res, next) => {
      try {
        const decoded = decodeURIComponent(req.url || '/')
        const filePath = path.join(ANIME_ROOT, decoded).replace(/\//g, path.sep)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          serveAnimeFile(req, res, filePath)
        } else {
          next()
        }
      } catch {
        next()
      }
    })
  },
}

export default defineConfig({
  plugins: [react(), animePlugin],
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          'three':    ['three'],
          'r3f':      ['@react-three/fiber', '@react-three/drei'],
          'vendor':   ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
