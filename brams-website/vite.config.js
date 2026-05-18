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
    target:               'es2020',
    chunkSizeWarningLimit: 3000,
    cssCodeSplit:         true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Librairies Three.js — ne charger que pour FamilyTree3D
          if (id.includes('node_modules/three/'))           return 'three'
          if (id.includes('@react-three'))                  return 'r3f'
          // Framer Motion — chunk séparé partagé lazy/eager
          if (id.includes('node_modules/framer-motion'))    return 'motion'
          // Supabase — chunk isolé
          if (id.includes('node_modules/@supabase'))        return 'supabase'
          // React core
          if (id.includes('node_modules/react-dom'))        return 'vendor'
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router'))     return 'vendor'
          // Gesture / animation utils
          if (id.includes('@use-gesture'))                  return 'motion'
          if (id.includes('node_modules/scheduler'))        return 'vendor'
        },
      },
    },
  },
})
