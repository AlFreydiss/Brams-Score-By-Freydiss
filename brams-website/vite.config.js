import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const mkvMime = {
  name: 'mkv-mime',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && /\.mkv(\?|$)/i.test(req.url)) {
        res.setHeader('Content-Type', 'video/x-matroska')
      }
      next()
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && /\.mkv(\?|$)/i.test(req.url)) {
        res.setHeader('Content-Type', 'video/x-matroska')
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [react(), mkvMime],
  build: { chunkSizeWarningLimit: 1000 },
})
