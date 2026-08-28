import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Plugin Vite officiel Tailwind v4 : indispensable — via @tailwindcss/postcss,
// Vite inlinait les @import AVANT le plugin et le scan @source/content était
// silencieusement désactivé (utilities jamais générées pour les nouveaux .tsx).
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ANIME_ROOT = path.join(__dirname, 'public', 'anime')

function serveAnimeFile(req, res, filePath) {
  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.mkv' ? 'video/x-matroska'
    : ext === '.mp4' ? 'video/mp4'
    : ext === '.vtt' ? 'text/vtt'
    : 'application/octet-stream'

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const range = req.headers.range
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1
    res.writeHead(206, {
      ...corsHeaders,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mime,
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Length': fileSize,
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
    })
    fs.createReadStream(filePath).pipe(res)
  }
}

function animeMiddleware(req, res, next) {
  try {
    const decoded = decodeURIComponent(req.url || '/')
    const filePath = path.join(ANIME_ROOT, decoded)
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveAnimeFile(req, res, filePath)
    } else {
      next()
    }
  } catch {
    next()
  }
}

const animePlugin = {
  name: 'anime-static',
  configureServer(server) {
    server.middlewares.use('/anime', animeMiddleware)
  },
  configurePreviewServer(server) {
    server.middlewares.use('/anime', animeMiddleware)
  },
}

// ── /api/subtitles/r2 en développement ─────────────────────────────────────
// En production c'est une fonction Vercel (api/subtitles.js). Le serveur Vite
// ne sert pas /api : sans ce relais, aucun sous-titre ne charge en local — ni
// sur la Guerre du Doublage, ni sur le Studio, qui en tire son script.
const R2_BASE = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/'

async function subtitlesMiddleware(req, res, next) {
  const target = new URL(req.url || '/', 'http://local').searchParams.get('url')
  if (!target || !target.startsWith(R2_BASE)) { next(); return }
  try {
    const upstream = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!upstream.ok) { res.statusCode = upstream.status; res.end(); return }
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(await upstream.text())
  } catch {
    res.statusCode = 502
    res.end()
  }
}

const devSubtitlesPlugin = {
  name: 'dev-subtitles-r2',
  configureServer(server) {
    server.middlewares.use('/api/subtitles/r2', subtitlesMiddleware)
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/subtitles/r2', subtitlesMiddleware)
  },
}

const pruneHeavyPublicAssets = {
  name: 'prune-heavy-public-assets',
  closeBundle() {
    // Prune legacy large dirs that may be copied from public/ (or stale in dist/)
    // Scans are now in Supabase; anime/Violet for dev only. This keeps final dist/ (and thus
    // prebuilt .vercel/output or hosted static) small, avoiding high file counts on Vercel.
    const heavyDirs = [
      path.join(__dirname, 'dist', 'Violet Evergarden'),
      path.join(__dirname, 'dist', 'scans'),
      path.join(__dirname, 'dist', 'anime'),
    ]
    for (const dir of heavyDirs) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), animePlugin, devSubtitlesPlugin, pruneHeavyPublicAssets],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    emptyOutDir: false,
    target:               'es2020',
    chunkSizeWarningLimit: 3500,   // le chunk r3f+drei (~3,1 Mo) est lazy-chargé (pages 3D only)
    cssCodeSplit:         true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // postprocessing s'isole proprement (dépend de r3f, pas l'inverse → pas de cycle).
          // drei reste avec r3f : le séparer crée un cycle drei↔r3f (ordre de chargement cassé).
          if (id.includes('@react-three/postprocessing') ||
              id.includes('node_modules/postprocessing'))   return 'postfx'
          if (id.includes('node_modules/three/'))           return 'three'
          if (id.includes('@react-three'))                  return 'r3f'
          if (id.includes('node_modules/framer-motion'))    return 'motion'
          if (id.includes('node_modules/@supabase'))        return 'supabase'
          if (id.includes('node_modules/react-dom'))        return 'vendor'
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router'))     return 'vendor'
          if (id.includes('@use-gesture'))                  return 'motion'
          if (id.includes('node_modules/scheduler'))        return 'vendor'
        },
      },
    },
  },
})
