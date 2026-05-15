import { useState, useRef, useCallback } from 'react'
import { upload } from '@vercel/blob/client'

const SERIES = [
  { id: 'tpn', label: 'The Promised Neverland', path: 'anime/tpn' },
  { id: 'drs', label: 'Dr. Stone',              path: 'anime/drs' },
]

function formatBytes(b) {
  if (b >= 1e9) return (b / 1e9).toFixed(2) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

function formatSpeed(bps) {
  if (bps >= 1e6) return (bps / 1e6).toFixed(1) + ' MB/s'
  return (bps / 1e3).toFixed(0) + ' KB/s'
}

function FileRow({ file, status }) {
  const pct   = status?.progress ?? 0
  const done  = status?.done
  const err   = status?.error
  const url   = status?.url

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 8,
      padding: '10px 14px',
      marginBottom: 8,
      borderLeft: `3px solid ${done ? '#2ecc71' : err ? '#e74c3c' : '#e0524a'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#ccc', wordBreak: 'break-all' }}>{file.name}</span>
        <span style={{ fontSize: 12, color: '#888', flexShrink: 0, marginLeft: 8 }}>
          {formatBytes(file.size)}
        </span>
      </div>

      {!done && !err && (
        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--accent, #e0524a)',
            borderRadius: 2,
            transition: 'width 0.3s',
          }} />
        </div>
      )}

      {!done && !err && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#888', display: 'flex', gap: 12 }}>
          <span>{pct.toFixed(1)}%</span>
          {status?.speed && <span>{formatSpeed(status.speed)}</span>}
          {status?.eta  && <span>ETA {status.eta}s</span>}
        </div>
      )}

      {done && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#2ecc71' }}>
          Terminé — <span style={{ userSelect: 'all', color: '#74b9ff' }}>{url}</span>
        </div>
      )}

      {err && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#e74c3c' }}>{err}</div>
      )}
    </div>
  )
}

export default function BlobUploadPage() {
  const [series, setSeries]     = useState(SERIES[0].id)
  const [secret, setSecret]     = useState('')
  const [files, setFiles]       = useState([])
  const [statuses, setStatuses] = useState({})
  const [uploading, setUploading] = useState(false)
  const [done, setDone]         = useState(false)
  const [urlMap, setUrlMap]     = useState([])
  const inputRef = useRef()
  const startRef = useRef({})

  const onFiles = useCallback(e => {
    const picked = Array.from(e.target.files || [])
    setFiles(picked)
    setStatuses({})
    setDone(false)
    setUrlMap([])
  }, [])

  const onDrop = useCallback(e => {
    e.preventDefault()
    const picked = Array.from(e.dataTransfer.files)
    setFiles(picked)
    setStatuses({})
    setDone(false)
    setUrlMap([])
  }, [])

  const setStatus = (name, patch) =>
    setStatuses(prev => ({ ...prev, [name]: { ...prev[name], ...patch } }))

  const run = async () => {
    if (!files.length) return
    setUploading(true)
    setDone(false)

    const ser = SERIES.find(s => s.id === series)
    const results = []

    for (const file of files) {
      startRef.current[file.name] = Date.now()
      setStatus(file.name, { progress: 0 })

      try {
        const blob = await upload(
          `${ser.path}/${file.name}`,
          file,
          {
            access: 'public',
            handleUploadUrl: '/api/upload',
            multipart: true,
            clientPayload: secret || undefined,
            headers: secret ? { 'x-upload-secret': secret } : {},
            onUploadProgress: ({ loaded, total, percentage }) => {
              const elapsed = (Date.now() - startRef.current[file.name]) / 1000
              const speed   = loaded / elapsed
              const eta     = speed > 0 ? Math.round((total - loaded) / speed) : null
              setStatus(file.name, { progress: percentage, speed, eta })
            },
          }
        )
        setStatus(file.name, { progress: 100, done: true, url: blob.url })
        results.push({ file: file.name, url: blob.url })
      } catch (err) {
        setStatus(file.name, { error: err.message })
      }
    }

    setUrlMap(results)
    setUploading(false)
    setDone(true)
  }

  const jsonOutput = urlMap.length
    ? JSON.stringify(urlMap.map(r => ({ name: r.file, url: r.url })), null, 2)
    : null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0c0e',
      color: '#fff',
      padding: '40px 24px',
      fontFamily: 'inherit',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Upload Vidéos → Vercel Blob
        </h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>
          Multipart upload jusqu'à 2 GB par fichier. MP4 + VTT supportés.
        </p>

        {/* Config */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Série</label>
            <select
              value={series}
              onChange={e => setSeries(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px',
                background: '#1a1b1e', border: '1px solid #333',
                borderRadius: 6, color: '#fff', fontSize: 14,
              }}
            >
              {SERIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>
              Secret (UPLOAD_SECRET si configuré)
            </label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Laisser vide si non configuré"
              style={{
                width: '100%', padding: '8px 12px',
                background: '#1a1b1e', border: '1px solid #333',
                borderRadius: 6, color: '#fff', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current.click()}
          style={{
            border: '2px dashed #333',
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 24,
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#e0524a'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 15, color: '#ccc' }}>
            Glisse tes fichiers ici ou <span style={{ color: '#e0524a' }}>clique pour choisir</span>
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
            MP4, VTT — jusqu'à 2 GB par fichier
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".mp4,.vtt,video/mp4,text/vtt"
            onChange={onFiles}
            style={{ display: 'none' }}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
              {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''} —{' '}
              total {formatBytes(files.reduce((a, f) => a + f.size, 0))}
            </div>
            {files.map(f => (
              <FileRow key={f.name} file={f} status={statuses[f.name]} />
            ))}
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={run}
          disabled={!files.length || uploading}
          style={{
            background: uploading ? '#333' : 'var(--accent, #e0524a)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
            cursor: uploading ? 'not-allowed' : 'pointer',
            width: '100%',
            marginBottom: 24,
          }}
        >
          {uploading ? 'Upload en cours...' : `Uploader ${files.length ? files.length + ' fichier' + (files.length > 1 ? 's' : '') : ''}`}
        </button>

        {/* Result JSON */}
        {done && jsonOutput && (
          <div>
            <div style={{ fontSize: 13, color: '#2ecc71', marginBottom: 8 }}>
              Tous les uploads terminés. Copie ces URLs dans ton JSON de données :
            </div>
            <pre style={{
              background: '#111',
              border: '1px solid #2ecc7144',
              borderRadius: 8,
              padding: 16,
              fontSize: 12,
              overflowX: 'auto',
              color: '#74b9ff',
              userSelect: 'all',
            }}>{jsonOutput}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
