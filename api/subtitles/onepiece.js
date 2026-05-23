const WYZIE_BASE = 'https://sub.wyzie.io/search'
const DEFAULT_SHOW_ID = 'tt0388629'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function srtToVtt(text) {
  const normalized = String(text || '')
    .replace(/\r/g, '')
    .replace(/^\uFEFF/, '')
    .replace(/^WEBVTT[^\n]*\n/i, '')

  const body = normalized
    .split('\n\n')
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const lines = block.split('\n')
      const timeLineIndex = lines.findIndex(line => line.includes('-->'))
      if (timeLineIndex < 0) return ''

      const timeLine = lines[timeLineIndex]
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')

      const textLines = lines.slice(timeLineIndex + 1).map(escapeHtml)
      return `${timeLine}\n${textLines.join('\n')}`
    })
    .filter(Boolean)
    .join('\n\n')

  return `WEBVTT\n\n${body}\n`
}

function assToVtt(text) {
  const normalized = String(text || '')
    .replace(/\r/g, '')
    .replace(/^\uFEFF/, '')

  const dialogueLines = normalized
    .split('\n')
    .filter(line => line.startsWith('Dialogue:'))

  const cues = dialogueLines.map(line => {
    const payload = line.slice('Dialogue:'.length).trim()
    const parts = payload.split(',')
    if (parts.length < 10) return null

    const start = parts[1]?.trim().replace(/(\d{2}:\d{2}:\d{2})\.(\d{2})/, '$1.$2')
    const end = parts[2]?.trim().replace(/(\d{2}:\d{2}:\d{2})\.(\d{2})/, '$1.$2')
    const textPart = parts.slice(9).join(',').replace(/\{[^}]*\}/g, '').replace(/\\N/g, '\n').trim()
    if (!start || !end || !textPart) return null
    return `${start} --> ${end}\n${escapeHtml(textPart)}`
  }).filter(Boolean)

  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

async function fetchSubtitleCandidates(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) return []

  const data = await response.json()
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.subtitles)) return data.subtitles
  return []
}

async function fetchSubtitleFile(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!response.ok) return null
  return await response.text()
}

export default async function handler(req, res) {
  const episode = Number.parseInt(req.query.episode || '', 10)
  if (!Number.isFinite(episode) || episode < 1086) {
    res.status(400).json({ error: 'invalid_episode' })
    return
  }

  const language = String(req.query.language || 'fr').toLowerCase()
  const showId = String(req.query.id || DEFAULT_SHOW_ID)
  const key = process.env.WYZIE_API_KEY || process.env.WYZIE_KEY || ''
  const source = String(req.query.source || 'all')
  const format = String(req.query.format || 'srt,ass,vtt')
  const episodeCandidates = [
    episode,
    Math.max(1, episode - 1085),
  ]

  try {
    let subtitle = null
    for (const candidateEpisode of episodeCandidates) {
      const searchUrl = new URL(WYZIE_BASE)
      searchUrl.searchParams.set('id', showId)
      searchUrl.searchParams.set('season', '1')
      searchUrl.searchParams.set('episode', String(candidateEpisode))
      searchUrl.searchParams.set('language', language)
      searchUrl.searchParams.set('format', format)
      searchUrl.searchParams.set('source', source)
      searchUrl.searchParams.set('refresh', 'true')
      searchUrl.searchParams.set('encoding', 'utf-8')
      if (key) searchUrl.searchParams.set('key', key)

      const candidates = await fetchSubtitleCandidates(searchUrl)
      subtitle = candidates.find(item => item?.url) || null
      if (subtitle) break
    }

    if (!subtitle?.url) {
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
      res.status(404).type('text/plain').send('No subtitles found')
      return
    }

    const raw = await fetchSubtitleFile(subtitle.url)
    if (!raw) {
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
      res.status(404).type('text/plain').send('Subtitle download failed')
      return
    }

    const contentType = String(subtitle.format || '').toLowerCase()
    const vtt = contentType === 'vtt'
      ? raw
      : contentType === 'ass' || contentType === 'ssa'
        ? assToVtt(raw)
        : srtToVtt(raw)

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
    res.status(200).send(vtt)
  } catch (error) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800')
    res.status(500).json({ error: error?.message || 'subtitle_fetch_failed' })
  }
}
