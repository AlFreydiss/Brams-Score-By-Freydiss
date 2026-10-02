// ── /staff/contenus — ajouter un épisode d'animé ou un chapitre de scan ──────
// Les fichiers partent du navigateur droit vers R2 (URL présignée, dossier
// contenus/), puis la fiche est enregistrée dans media_additions via
// /api/media-additions (rôle staff vérifié côté serveur). Le site fusionne ces
// fiches à l'ouverture des pages : rien à builder, rien à committer.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { isStaff } from '../lib/roles.js'
import { getAccessToken } from '../lib/supabaseRest.js'
import { ANIMES } from './AnimeHub.jsx'
import { SCANS } from '../data/scans-catalog.js'
import { ANIME_VIDEO_FILES, fetchAdditions, invalidateAdditions, mergeVideos } from '../lib/mediaAdditions.js'
import { loadManga } from '../lib/mangaData.js'

const VIDEO_MODULES = import.meta.glob('../data/*-videos.json')

const C = {
  bg: '#0b0d12', panel: 'rgba(255,255,255,0.04)', line: 'rgba(255,255,255,0.09)',
  text: '#eef0f4', dim: 'rgba(238,240,244,0.62)', faint: 'rgba(238,240,244,0.4)',
  accent: '#d7a44a', ok: '#34d399', err: '#f87171',
}
const input = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, fontSize: 14,
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.line}`, color: C.text, outline: 'none', fontFamily: 'inherit',
}
const label = { display: 'grid', gap: 6, fontSize: 12.5, fontWeight: 700, color: C.dim }
const btn = (primary, disabled) => ({
  padding: '11px 18px', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: disabled ? 'default' : 'pointer',
  border: primary ? 'none' : `1px solid ${C.line}`, opacity: disabled ? 0.45 : 1,
  background: primary ? C.accent : 'rgba(255,255,255,0.06)', color: primary ? '#17120a' : C.text, fontFamily: 'inherit',
})

const natural = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' })
const fmtDur = s => {
  s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
const fmtSize = b => (b > 1e9 ? `${(b / 1e9).toFixed(2)} Go` : `${(b / 1e6).toFixed(1)} Mo`)

// SRT → WebVTT : même contenu, en-tête et virgules des horodatages.
function srtToVtt(text) {
  return 'WEBVTT\n\n' + text.replace(/\r/g, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').trim() + '\n'
}

// HEVC (x265) : Chrome sous Windows le décode grâce au GPU, donc la vérification
// ci-dessous passe chez le staff… et l'épisode reste noir sur Firefox et sur
// bien des téléphones. On cherche la fiche du codec (hvc1 / hev1) dans les
// boîtes MP4, au début et à la fin du fichier (le « moov » peut être en fin).
async function isHevc(file) {
  const CHUNK = 4 * 1024 * 1024
  const parts = [file.slice(0, CHUNK)]
  if (file.size > CHUNK) parts.push(file.slice(Math.max(CHUNK, file.size - CHUNK)))
  for (const part of parts) {
    const bytes = new Uint8Array(await part.arrayBuffer())
    // 'hvc1' = 68 76 63 31 · 'hev1' = 68 65 76 31
    for (let i = 0; i < bytes.length - 3; i++) {
      if (bytes[i] !== 0x68 || bytes[i + 3] !== 0x31) continue
      if ((bytes[i + 1] === 0x76 && bytes[i + 2] === 0x63) || (bytes[i + 1] === 0x65 && bytes[i + 2] === 0x76)) return true
    }
  }
  return false
}

// Le navigateur sait-il lire ce fichier ? (un MKV x265 passe le choix de
// fichier mais reste noir dans le lecteur). On en profite pour la durée et
// une miniature prise à 40 %.
function probeVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true; v.preload = 'auto'; v.playsInline = true
    let done = false
    const finish = (r) => { if (done) return; done = true; clearTimeout(t); URL.revokeObjectURL(url); resolve(r) }
    const t = setTimeout(() => finish({ ok: false, reason: 'timeout' }), 15000)
    v.onerror = () => finish({ ok: false, reason: 'codec' })
    v.onloadedmetadata = () => {
      if (!v.videoWidth || !isFinite(v.duration)) return finish({ ok: false, reason: 'codec' })
      v.currentTime = Math.max(1, v.duration * 0.4)
    }
    v.onseeked = () => {
      try {
        const w = 640, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h
        cv.getContext('2d').drawImage(v, 0, 0, w, h)
        cv.toBlob(b => finish({ ok: true, duration: v.duration, width: v.videoWidth, height: v.videoHeight, thumb: b }), 'image/jpeg', 0.82)
      } catch { finish({ ok: true, duration: v.duration, width: v.videoWidth, height: v.videoHeight, thumb: null }) }
    }
    v.src = url
  })
}

async function presign({ area, series, file, filename, contentType }) {
  const token = await getAccessToken()
  if (!token) throw new Error('Session expirée : reconnecte-toi.')
  const r = await fetch('/api/r2-presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ area, series, filename, contentType, size: file.size }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.uploadUrl) throw new Error(j.error || `Préparation de l'envoi refusée (${r.status})`)
  return j
}

// PUT direct vers R2, avec progression (fetch n'en donne pas à l'envoi).
function putWithProgress(url, body, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('PUT', url)
    x.setRequestHeader('Content-Type', contentType)
    x.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(e.loaded / e.total) }
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Envoi R2 refusé (${x.status})`)))
    x.onerror = () => reject(new Error('Envoi interrompu (réseau).'))
    x.send(body)
  })
}

async function uploadFile({ area, series, file, filename = file.name, contentType = file.type, onProgress }) {
  const { uploadUrl, publicUrl } = await presign({ area, series, file, filename, contentType })
  await putWithProgress(uploadUrl, file, contentType, onProgress)
  return publicUrl
}

async function saveRecord(body) {
  const token = await getAccessToken()
  const r = await fetch('/api/media-additions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Enregistrement refusé (${r.status})`)
  invalidateAdditions()
  return j.row
}

function Progress({ value, text }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(value * 100)}%`, background: C.accent, transition: 'width .2s' }} />
      </div>
      <div style={{ fontSize: 12.5, color: C.dim }}>{text}</div>
    </div>
  )
}

function Status({ state }) {
  if (!state) return null
  const color = state.type === 'error' ? C.err : state.type === 'ok' ? C.ok : C.dim
  return <p role={state.type === 'error' ? 'alert' : 'status'} style={{ margin: 0, fontSize: 14, fontWeight: 700, color }}>{state.text}</p>
}

// ── Épisode ──────────────────────────────────────────────────────────────────
const ANIME_CHOICES = ANIMES.filter(a => ANIME_VIDEO_FILES[a.id]).map(a => ({ id: a.id, title: a.title }))
  .sort((a, b) => natural.compare(a.title, b.title))

function EpisodeForm({ onSaved }) {
  const [anime, setAnime] = useState(ANIME_CHOICES[0]?.id || '')
  const [existing, setExisting] = useState(null)
  const [season, setSeason] = useState('S01')
  const [num, setNum] = useState('')
  const [title, setTitle] = useState('')
  const [epLabel, setEpLabel] = useState('')
  const [lang, setLang] = useState('ja')
  const [video, setVideo] = useState(null)      // { file, probe }
  const [subs, setSubs] = useState(null)        // File
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [state, setState] = useState(null)
  const thumbUrl = useMemo(() => (video?.probe?.thumb ? URL.createObjectURL(video.probe.thumb) : null), [video])
  useEffect(() => () => { if (thumbUrl) URL.revokeObjectURL(thumbUrl) }, [thumbUrl])

  // Liste actuelle de l'animé (livrée + ajouts) : saisons et dernier numéro,
  // pour proposer la suite au lieu de laisser deviner la numérotation.
  useEffect(() => {
    let alive = true
    setExisting(null)
    const load = VIDEO_MODULES[`../data/${ANIME_VIDEO_FILES[anime]}.json`]
    if (!load) return
    Promise.all([load(), fetchAdditions({ fresh: true })]).then(([mod, rows]) => {
      if (!alive) return
      const list = mergeVideos([...(mod.default || [])], rows.filter(r => r.kind === 'episode' && r.series === anime))
      const bySeason = new Map()
      for (const v of list) {
        if (v.kind) continue
        const s = String(v.season ?? 'S01')
        const cur = bySeason.get(s)
        if (!cur || Number(v.episode) > Number(cur.episode)) bySeason.set(s, v)
      }
      const seasons = [...bySeason.entries()].map(([s, v]) => ({ season: s, last: v }))
      setExisting({ total: list.length, seasons })
      const lastS = seasons[seasons.length - 1]
      if (lastS) {
        setSeason(lastS.season)
        setNum(String(Number(lastS.last.episode) + 1))
      } else { setSeason('S01'); setNum('1') }
    }).catch(() => alive && setExisting({ total: 0, seasons: [] }))
    return () => { alive = false }
  }, [anime])

  const pickVideo = async (file) => {
    setState(null); setVideo(null)
    if (!file) return
    if (!/^video\/(mp4|webm)$/.test(file.type)) {
      setState({ type: 'error', text: `Format ${file.name.split('.').pop()?.toUpperCase()} non lisible sur le web : convertis en MP4 (H.264 + AAC) ou WebM.` })
      return
    }
    setState({ type: 'info', text: 'Vérification de la vidéo…' })
    if (file.type === 'video/mp4' && await isHevc(file).catch(() => false)) {
      setState({ type: 'error', text: 'Vidéo en HEVC / x265 : illisible sur Firefox et beaucoup de téléphones. Réencode-la en MP4 H.264 + AAC.' })
      return
    }
    const probe = await probeVideo(file)
    if (!probe.ok) {
      setState({ type: 'error', text: probe.reason === 'timeout'
        ? 'Lecture impossible à vérifier (fichier trop lent à lire).'
        : "Ce navigateur ne lit pas cette vidéo (codec HEVC/x265 ?). Réencode-la en MP4 H.264 + AAC." })
      return
    }
    setVideo({ file, probe })
    setState({ type: 'info', text: `OK · ${probe.width}×${probe.height} · ${fmtDur(probe.duration)} · ${fmtSize(file.size)}` })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!video || busy) return
    const n = Number(num)
    if (!Number.isFinite(n) || n < 0) { setState({ type: 'error', text: 'Numéro invalide.' }); return }
    setBusy(true); setState(null)
    try {
      const base = `${season}E${String(num).replace('.', '_')}`
      setProgress({ value: 0, text: 'Envoi de la vidéo…' })
      const src = await uploadFile({
        area: 'anime', series: anime, file: video.file, filename: `${base}.${video.file.type === 'video/webm' ? 'webm' : 'mp4'}`,
        onProgress: p => setProgress({ value: p * 0.9, text: `Envoi de la vidéo… ${Math.round(p * 100)} %` }),
      })
      let thumbnail = null
      if (video.probe.thumb) {
        setProgress({ value: 0.92, text: 'Envoi de la miniature…' })
        const f = new File([video.probe.thumb], `${base}-thumb.jpg`, { type: 'image/jpeg' })
        thumbnail = await uploadFile({ area: 'anime', series: anime, file: f })
      }
      let subtitles = null
      if (subs) {
        setProgress({ value: 0.95, text: 'Envoi des sous-titres…' })
        const raw = await subs.text()
        const vtt = /\.srt$/i.test(subs.name) ? srtToVtt(raw) : raw
        const f = new File([vtt], `${base}-fr.vtt`, { type: 'text/vtt' })
        subtitles = await uploadFile({ area: 'anime', series: anime, file: f, contentType: 'text/vtt' })
      }
      setProgress({ value: 0.98, text: 'Enregistrement…' })
      await saveRecord({
        kind: 'episode', series: anime, num: n, season, title,
        data: { src, thumbnail, subtitles, duration: fmtDur(video.probe.duration), audioLang: lang, audioLabel: lang === 'fr' ? 'VF' : 'VOSTFR', label: epLabel },
      })
      setProgress(null)
      setState({ type: 'ok', text: `✓ Épisode ${num} publié. Il apparaît sur la page de l'animé (rechargement si elle était ouverte).` })
      setVideo(null); setSubs(null); setTitle(''); setEpLabel(''); setNum(String(n + 1))
      onSaved?.()
    } catch (err) {
      setProgress(null)
      setState({ type: 'error', text: err.message || 'Échec.' })
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <label style={label}>Animé
        <select value={anime} onChange={e => setAnime(e.target.value)} style={input} disabled={busy}>
          {ANIME_CHOICES.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </label>
      {existing && (
        <div style={{ fontSize: 12.5, color: C.faint, lineHeight: 1.6 }}>
          {existing.total} vidéo{existing.total > 1 ? 's' : ''} actuellement.
          {existing.seasons.map(s => ` ${s.season} : dernier n° ${s.last.episode}${s.last.episodeLabel ? ` (${s.last.episodeLabel})` : ''}.`).join('')}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <label style={label}>Saison
          <input value={season} onChange={e => setSeason(e.target.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, ''))} style={input} disabled={busy} placeholder="S01" />
        </label>
        <label style={label}>N° d'épisode
          <input value={num} onChange={e => setNum(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" style={input} disabled={busy} required />
        </label>
        <label style={label}>Audio
          <select value={lang} onChange={e => setLang(e.target.value)} style={input} disabled={busy}>
            <option value="ja">VOSTFR (japonais)</option>
            <option value="fr">VF (français)</option>
          </select>
        </label>
      </div>
      <label style={label}>Titre
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} style={input} disabled={busy} placeholder="Titre de l'épisode" />
      </label>
      <label style={label}>Libellé affiché (optionnel)
        <input value={epLabel} onChange={e => setEpLabel(e.target.value)} maxLength={40} style={input} disabled={busy} placeholder="ex. S05E08 — sinon « Épisode N »" />
      </label>
      <label style={label}>Vidéo · MP4 (H.264 + AAC) ou WebM, 5 Go max
        <input type="file" accept="video/mp4,video/webm" onChange={e => pickVideo(e.target.files?.[0])} style={input} disabled={busy} />
      </label>
      {thumbUrl && (
        <img alt="Miniature générée" src={thumbUrl} style={{ width: 240, borderRadius: 10, border: `1px solid ${C.line}` }} />
      )}
      <label style={label}>Sous-titres français (optionnel) · .vtt ou .srt
        <input type="file" accept=".vtt,.srt,text/vtt" onChange={e => setSubs(e.target.files?.[0] || null)} style={input} disabled={busy} />
      </label>
      {progress && <Progress {...progress} />}
      <Status state={state} />
      <div><button type="submit" disabled={!video || busy} style={btn(true, !video || busy)}>{busy ? 'Publication…' : "Publier l'épisode"}</button></div>
    </form>
  )
}

// ── Chapitre ─────────────────────────────────────────────────────────────────
const SCAN_CHOICES = [...SCANS].map(s => ({ slug: s.slug, title: s.title })).sort((a, b) => natural.compare(a.title, b.title))

function ChapterForm({ onSaved }) {
  const [slug, setSlug] = useState(SCAN_CHOICES[0]?.slug || '')
  const [info, setInfo] = useState(null)
  const [num, setNum] = useState('')
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [state, setState] = useState(null)
  const previews = useMemo(() => files.slice(0, 6).map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews])

  useEffect(() => {
    let alive = true
    setInfo(null)
    fetchAdditions({ fresh: true }).then(() => loadManga(slug)).then(list => {
      if (!alive) return
      const nums = list.map(c => Number(c.num)).filter(Number.isFinite)
      const last = nums.length ? Math.max(...nums) : 0
      setInfo({ count: list.length, first: nums.length ? Math.min(...nums) : null, last })
      setNum(String(Math.floor(last) + 1))
    }).catch(() => alive && setInfo({ count: 0, first: null, last: 0 }))
    return () => { alive = false }
  }, [slug])

  const pick = (list) => {
    setState(null)
    const imgs = [...(list || [])].filter(f => /^image\/(jpeg|png|webp)$/.test(f.type)).sort((a, b) => natural.compare(a.name, b.name))
    const skipped = (list?.length || 0) - imgs.length
    setFiles(imgs)
    if (skipped > 0) setState({ type: 'error', text: `${skipped} fichier(s) ignoré(s) : seuls JPG, PNG et WebP passent.` })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!files.length || busy) return
    const n = Number(num)
    if (!Number.isFinite(n) || n < 0) { setState({ type: 'error', text: 'Numéro invalide.' }); return }
    setBusy(true); setState(null)
    try {
      // 4 envois en parallèle : un chapitre fait 20 à 60 pages.
      const pages = new Array(files.length)
      let done = 0, next = 0
      const tag = String(num).replace('.', '_')
      const worker = async () => {
        while (next < files.length) {
          const i = next++
          const f = files[i]
          const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg'
          pages[i] = await uploadFile({ area: 'manga', series: slug, file: f, filename: `ch${tag}-${String(i + 1).padStart(3, '0')}.${ext}` })
          done++
          setProgress({ value: done / files.length * 0.97, text: `Pages envoyées : ${done} / ${files.length}` })
        }
      }
      setProgress({ value: 0, text: `Pages envoyées : 0 / ${files.length}` })
      await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker))
      setProgress({ value: 0.98, text: 'Enregistrement…' })
      await saveRecord({ kind: 'chapter', series: slug, num: n, title, data: { pages } })
      setProgress(null)
      setState({ type: 'ok', text: `✓ Chapitre ${num} publié (${files.length} pages).` })
      setFiles([]); setTitle(''); setNum(String(Math.floor(n) + 1))
      onSaved?.()
    } catch (err) {
      setProgress(null)
      setState({ type: 'error', text: err.message || 'Échec.' })
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <label style={label}>Série
        <select value={slug} onChange={e => setSlug(e.target.value)} style={input} disabled={busy}>
          {SCAN_CHOICES.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}
        </select>
      </label>
      {info && (
        <div style={{ fontSize: 12.5, color: C.faint }}>
          {info.count} chapitre{info.count > 1 ? 's' : ''}{info.first != null ? ` (ch. ${info.first} à ${info.last})` : ''}.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <label style={label}>N° de chapitre
          <input value={num} onChange={e => setNum(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" style={input} disabled={busy} required />
        </label>
        <label style={label}>Titre (optionnel)
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} style={input} disabled={busy} />
        </label>
      </div>
      <label style={label}>Pages · JPG, PNG ou WebP, dans l'ordre des noms de fichiers
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => pick(e.target.files)} style={input} disabled={busy} />
      </label>
      {files.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12.5, color: C.dim }}>
            {files.length} page{files.length > 1 ? 's' : ''} · {fmtSize(files.reduce((s, f) => s + f.size, 0))} · de « {files[0].name} » à « {files[files.length - 1].name} »
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {previews.map((u, i) => <img key={i} src={u} alt={`Page ${i + 1}`} style={{ height: 120, borderRadius: 6, border: `1px solid ${C.line}` }} />)}
          </div>
        </div>
      )}
      {progress && <Progress {...progress} />}
      <Status state={state} />
      <div><button type="submit" disabled={!files.length || busy} style={btn(true, !files.length || busy)}>{busy ? 'Publication…' : 'Publier le chapitre'}</button></div>
    </form>
  )
}

// ── Liste des ajouts ─────────────────────────────────────────────────────────
const NAME = Object.fromEntries([...ANIMES.map(a => [a.id, a.title]), ...SCANS.map(s => [s.slug, s.title])])

function AdditionsList({ refreshKey }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const load = () => fetchAdditions({ fresh: true }).then(setRows).catch(() => setRows([]))
  useEffect(() => { load() }, [refreshKey])

  const remove = async (row) => {
    const what = row.kind === 'episode' ? `l'épisode ${row.num}` : `le chapitre ${row.num}`
    if (!window.confirm(`Retirer ${what} de ${NAME[row.series] || row.series} du site ? (Le fichier reste sur R2.)`)) return
    setErr(null)
    const token = await getAccessToken()
    const r = await fetch(`/api/media-additions?id=${row.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || `Suppression refusée (${r.status})`); return }
    invalidateAdditions(); load()
  }

  if (!rows) return <p style={{ color: C.faint, fontSize: 13 }}>Chargement…</p>
  if (!rows.length) return <p style={{ color: C.faint, fontSize: 13 }}>Aucun ajout pour l'instant.</p>
  const sorted = [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {err && <p role="alert" style={{ color: C.err, fontSize: 13, margin: 0 }}>{err}</p>}
      {sorted.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: C.panel, border: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 18 }} aria-hidden>{r.kind === 'episode' ? '🎬' : '📖'}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {NAME[r.series] || r.series} · {r.kind === 'episode' ? `${r.season} ép. ${r.num}` : `ch. ${r.num}`}{r.title ? ` — ${r.title}` : ''}
            </div>
            <div style={{ fontSize: 12, color: C.faint }}>
              {new Date(r.created_at).toLocaleString('fr-FR')}{r.kind === 'chapter' ? ` · ${r.data?.pages?.length || 0} pages` : r.data?.duration ? ` · ${r.data.duration}` : ''}
            </div>
          </div>
          <Link to={r.kind === 'episode' ? `/animes-scan/${r.series}` : `/manga/${r.series}?ch=${r.num}`} style={{ fontSize: 12.5, color: C.accent, fontWeight: 700 }}>Voir</Link>
          <button onClick={() => remove(r)} style={{ ...btn(false, false), padding: '6px 10px', fontSize: 12.5 }}>Retirer</button>
        </div>
      ))}
    </div>
  )
}

export default function MediaAdminPage() {
  const { isAuthenticated, discordId, userId, loading } = useAuth()
  const [tab, setTab] = useState('episode')
  const [refresh, setRefresh] = useState(0)
  const allowed = isAuthenticated && isStaff(discordId, userId)
  const topRef = useRef(null)

  return (
    <div ref={topRef} style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: 'var(--body, Inter, system-ui, sans-serif)', padding: '96px 16px 80px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 22 }}>
        <header>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: C.accent }}>STAFF</div>
          <h1 style={{ margin: '6px 0 6px', fontSize: 28, fontWeight: 900 }}>Ajouter un épisode ou un chapitre</h1>
          <p style={{ margin: 0, fontSize: 14, color: C.dim, lineHeight: 1.6 }}>
            Le fichier part directement sur R2, la fiche apparaît sur le site sans redéploiement.
            Mets en ligne uniquement des contenus que la Brams Community a le droit de diffuser.
          </p>
        </header>

        {loading ? <p style={{ color: C.faint }}>Chargement…</p> : !allowed ? (
          <section style={{ padding: 20, borderRadius: 14, background: C.panel, border: `1px solid ${C.line}` }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{isAuthenticated ? 'Page réservée au staff.' : 'Connecte-toi avec un compte staff pour accéder à cette page.'}</p>
          </section>
        ) : (
          <>
            <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: C.panel, border: `1px solid ${C.line}`, width: 'fit-content' }}>
              {[['episode', '🎬 Épisode d\'animé'], ['chapter', '📖 Chapitre de scan']].map(([id, txt]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{
                  padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
                  background: tab === id ? C.accent : 'transparent', color: tab === id ? '#17120a' : C.dim,
                }}>{txt}</button>
              ))}
            </div>
            <section style={{ padding: 20, borderRadius: 16, background: C.panel, border: `1px solid ${C.line}` }}>
              {tab === 'episode'
                ? <EpisodeForm onSaved={() => setRefresh(x => x + 1)} />
                : <ChapterForm onSaved={() => setRefresh(x => x + 1)} />}
            </section>
            <section style={{ display: 'grid', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Ajouts publiés</h2>
              <AdditionsList refreshKey={refresh} />
            </section>
          </>
        )}
      </div>
    </div>
  )
}
