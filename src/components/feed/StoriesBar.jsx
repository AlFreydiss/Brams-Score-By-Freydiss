import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { listActiveStories, createStory, uploadAttachment, getUserPosts } from '../../lib/feed.js'
import StoryViewer from './StoryViewer.jsx'
import VideoTrimmer from './VideoTrimmer.jsx'
import { avatar, T } from '../social/socialStyles.js'

const ALLOWED_VISUAL = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']

export default function StoriesBar() {
  const { isAuthenticated, displayName, avatarUrl, discordId } = useAuth()
  const [authors, setAuthors] = useState([])
  const [viewer, setViewer] = useState(null) // { authors: snapshot figé, idx }
  const [uploading, setUploading] = useState(false)
  const [showComposer, setShowComposer] = useState(false)

  // Composer state
  const [visualFile, setVisualFile] = useState(null)
  const [visualPreview, setVisualPreview] = useState(null) // url for preview
  const [visualIsVideo, setVisualIsVideo] = useState(false)
  const [audioFile, setAudioFile] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null)
  const [musicTitle, setMusicTitle] = useState('')
  const [importMedia, setImportMedia] = useState([]) // recent post media for import
  const [loadingImport, setLoadingImport] = useState(false)
  const [selectedImportUrl, setSelectedImportUrl] = useState(null)
  const [trimming, setTrimming] = useState(false) // modale de rognage vidéo

  const visualInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const refreshRef = useRef(null)

  const load = useCallback(() => { listActiveStories().then(a => setAuthors(Array.isArray(a) ? a : [])) }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const schedule = () => {
      clearTimeout(refreshRef.current)
      refreshRef.current = setTimeout(load, 120)
    }
    const onVisible = () => { if (!document.hidden) schedule() }
    window.addEventListener('focus', schedule)
    document.addEventListener('visibilitychange', onVisible)
    const iv = setInterval(() => { if (!document.hidden) load() }, 30000)
    return () => {
      window.removeEventListener('focus', schedule)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(iv)
      clearTimeout(refreshRef.current)
    }
  }, [load])

  // Load recent media from user's posts for "importer"
  const loadImportMedia = useCallback(async () => {
    if (!discordId) return
    setLoadingImport(true)
    try {
      const posts = await getUserPosts(discordId, null, 12)
      const medias = []
      ;(posts || []).forEach(p => {
        const urls = p.media_urls?.length ? p.media_urls : (p.media_url ? [p.media_url] : [])
        urls.slice(0, 2).forEach(u => {
          if (u && !medias.some(m => m.url === u)) {
            medias.push({ url: u, id: p.id })
          }
        })
      })
      setImportMedia(medias.slice(0, 8))
    } catch {}
    setLoadingImport(false)
  }, [discordId])

  function openComposer() {
    setShowComposer(true)
    setVisualFile(null)
    setVisualPreview(null)
    setVisualIsVideo(false)
    setAudioFile(null)
    setAudioPreviewUrl(null)
    setMusicTitle('')
    setSelectedImportUrl(null)
    setImportMedia([])
    if (discordId) loadImportMedia()
  }

  function closeComposer() {
    setShowComposer(false)
    // cleanup previews
    if (visualPreview) URL.revokeObjectURL(visualPreview)
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
  }

  function onVisualSelected(file) {
    if (!file) return
    if (!ALLOWED_VISUAL.includes(file.type) && !file.type.startsWith('video/')) {
      alert('Format image ou vidéo non supporté')
      return
    }
    const isVid = file.type.startsWith('video/')
    const maxMo = isVid ? 5120 : 45
    if (file.size > maxMo * 1024 * 1024) { alert(isVid ? 'Vidéo trop lourde (max 5 Go)' : `Visuel trop lourd (max ~${maxMo} Mo)`); return }

    if (visualPreview) URL.revokeObjectURL(visualPreview)
    const url = URL.createObjectURL(file)
    setVisualFile(file)
    setVisualPreview(url)
    setVisualIsVideo(file.type.startsWith('video/'))
    setSelectedImportUrl(null) // clear import if any
  }

  function onAudioSelected(file) {
    if (!file) return
    if (!ALLOWED_AUDIO.includes(file.type) && !file.type.startsWith('audio/')) {
      alert('Format audio non supporté')
      return
    }
    if (file.size > 15 * 1024 * 1024) { alert('Son trop lourd (max 15 Mo)'); return }

    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
    const url = URL.createObjectURL(file)
    setAudioFile(file)
    setAudioPreviewUrl(url)
  }

  function pickImport(url) {
    setSelectedImportUrl(url)
    setVisualFile(null)
    if (visualPreview) { URL.revokeObjectURL(visualPreview); setVisualPreview(null) }
    setVisualIsVideo(/\.(mp4|webm)/i.test(url))
    setVisualPreview(url) // use the remote url directly for preview
  }

  async function publishStory() {
    if (!visualFile && !selectedImportUrl) {
      alert('Ajoute un visuel (image ou vidéo) ou importe un média')
      return
    }
    setUploading(true)
    try {
      let mediaUrl = selectedImportUrl
      if (!mediaUrl && visualFile) {
        const up = await uploadAttachment(visualFile)
        if (up.error) { alert(up.error); return }
        mediaUrl = up.url
      }

      let audioUrl = null
      if (audioFile) {
        const aup = await uploadAttachment(audioFile)
        if (aup.error) {
          alert('Son uploadé mais échec: ' + aup.error)
        } else {
          audioUrl = aup.url
        }
      }

      const res = await createStory({
        mediaUrl,
        audioUrl,
        musicTitle: musicTitle || null,
        musicArtist: null,
      })
      if (res?.ok) {
        closeComposer()
        load()
      } else if (res?.error) {
        alert(res.error)
      }
    } finally {
      setUploading(false)
    }
  }

  // Rien à afficher si pas connecté et aucune story
  if (!isAuthenticated && authors.length === 0) return null

  const Ring = ({ children, seen }) => (
    <div style={{ padding: 2, borderRadius: '50%', background: seen ? 'rgba(255,255,255,.18)' : 'linear-gradient(135deg, #d4a017, #9b6cff)' }}>
      <div style={{ padding: 2, borderRadius: '50%', background: T.bg }}>{children}</div>
    </div>
  )

  return (
    <div className="stories-scroll" style={{ display: 'flex', gap: 14, padding: '14px 16px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
      <style>{`.stories-scroll::-webkit-scrollbar{display:none}`}</style>
      {isAuthenticated && (
        <button
          onClick={openComposer}
          disabled={uploading}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0, width: 64 }}
        >
          <div style={{ position: 'relative' }}>
            <span style={{ ...avatar(58), opacity: uploading ? 0.5 : 1 }}>{avatarUrl ? <img loading="lazy" decoding="async" src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (displayName || '?').slice(0, 2).toUpperCase()}</span>
            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: T.gold, color: '#0b0c0e', fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${T.bg}` }}>+</span>
          </div>
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600 }}>{uploading ? '…' : 'Ta story'}</span>
        </button>
      )}

      {authors.map((a, i) => (
        <button key={a.author_id} onClick={() => setViewer({ authors, idx: i })}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0, width: 64 }}>
          <Ring seen={a.all_seen}><span style={avatar(54)}>{a.avatar ? <img loading="lazy" decoding="async" src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.username || '?').slice(0, 2).toUpperCase()}</span></Ring>
          <span style={{ fontSize: 11, color: T.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64 }}>{a.username || `#${String(a.author_id).slice(-4)}`}</span>
        </button>
      ))}

      {/* Portals sur document.body : .feed-main a un backdrop-filter qui ferait
          du position:fixed un fixed RELATIF à la colonne (containing block) —
          le viewer resterait piégé/invisible dans la barre. */}
      {/* La liste est FIGÉE à l'ouverture (snapshot) : recharger les stories
          pendant le visionnage (onSeen → load) re-triait les auteurs et faisait
          sauter/couper la story en cours (~1 s, le temps du mark-seen).
          Les anneaux "vu" se rafraîchissent à la fermeture. */}
      {viewer !== null && createPortal(
        <StoryViewer authors={viewer.authors} startIndex={viewer.idx} onClose={() => { setViewer(null); load() }} onDeleted={() => { setViewer(null); load() }} />,
        document.body
      )}

      {/* ===== STORY COMPOSER MODAL (upload pendant la création + importer) ===== */}
      {showComposer && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={closeComposer}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxWidth:820, background:'#0f1118', border:'1px solid rgba(255,255,255,.1)',
              borderRadius:20, overflow:'hidden', boxShadow:'0 30px 80px rgba(0,0,0,.8)'
            }}
          >
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center' }}>
              <div style={{ fontWeight:900, fontSize:18 }}>Créer une story</div>
              <button onClick={closeComposer} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#fff', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>

            <div style={{ padding:20, display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
              {/* VISUAL */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:8 }}>VISUEL (image ou vidéo)</div>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onVisualSelected(f) }}
                  onClick={() => visualInputRef.current?.click()}
                  style={{
                    border:'2px dashed rgba(212,160,23,.35)', borderRadius:16, minHeight:260,
                    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                    background: visualPreview ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.015)',
                    position:'relative', overflow:'hidden'
                  }}
                >
                  {visualPreview ? (
                    visualIsVideo ? (
                      <video src={visualPreview} controls style={{ maxWidth:'100%', maxHeight:320, borderRadius:8 }} />
                    ) : (
                      <img loading="lazy" decoding="async" src={visualPreview} alt="" style={{ maxWidth:'100%', maxHeight:320, objectFit:'contain', borderRadius:8 }} />
                    )
                  ) : (
                    <div style={{ textAlign:'center', color:'rgba(255,255,255,.5)' }}>
                      <div style={{ fontSize:42, marginBottom:8 }}>📸</div>
                      <div style={{ fontWeight:700 }}>Glisse une image ou vidéo ici</div>
                      <div style={{ fontSize:12, marginTop:4 }}>ou clique pour choisir</div>
                    </div>
                  )}
                  <input ref={visualInputRef} type="file" accept="image/*,video/mp4,video/webm" style={{ display:'none' }} onChange={e => onVisualSelected(e.target.files?.[0])} />
                </div>
                {/* Rognage : uniquement pour un fichier vidéo local (pas un import d'URL) */}
                {visualIsVideo && visualFile && (
                  <button onClick={() => setTrimming(true)} style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                    background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.35)', color: T.gold,
                  }}>
                    ✂️ Rogner la vidéo
                  </button>
                )}
              </div>

              {/* AUDIO + IMPORT */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:8 }}>MUSIQUE / SON (optionnel)</div>
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onAudioSelected(f) }}
                    onClick={() => audioInputRef.current?.click()}
                    style={{
                      border:'1px dashed rgba(212,160,23,.3)', borderRadius:12, padding:14,
                      background:'rgba(255,255,255,.02)', cursor:'pointer', minHeight:92
                    }}
                  >
                    {!audioFile ? (
                      <div style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,.55)' }}>
                        Glisse un mp3 / son ou clique<br />
                        <span style={{ fontSize:11 }}>Le son jouera en fond pendant la story</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight:700, marginBottom:6 }}>{musicTitle || 'Son ajouté'}</div>
                        <audio controls src={audioPreviewUrl} style={{ width:'100%' }} />
                        <input
                          value={musicTitle}
                          onChange={e => setMusicTitle(e.target.value)}
                          placeholder="Titre de la musique (ex: Unravel)"
                          style={{ width:'100%', marginTop:8, background:'#1a1d27', border:'1px solid rgba(255,255,255,.1)', color:'#fff', borderRadius:8, padding:'6px 10px', fontSize:13 }}
                        />
                      </div>
                    )}
                  </div>
                  <input ref={audioInputRef} type="file" accept="audio/*" style={{ display:'none' }} onChange={e => onAudioSelected(e.target.files?.[0])} />
                </div>

                {/* IMPORTER */}
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:6 }}>Ou importer un média déjà uploadé</div>
                  {loadingImport ? (
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>Chargement de tes médias…</div>
                  ) : importMedia.length > 0 ? (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {importMedia.map((m, idx) => (
                        <button key={idx} onClick={() => pickImport(m.url)}
                          style={{
                            width:68, height:68, borderRadius:8, overflow:'hidden', border: selectedImportUrl === m.url ? '2px solid #d4a017' : '1px solid rgba(255,255,255,.1)',
                            padding:0, background:'#111', cursor:'pointer'
                          }}>
                          {/\.(mp4|webm)/i.test(m.url) ? (
                            <video src={m.url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          ) : (
                            <img loading="lazy" decoding="async" src={m.url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>Aucun média récent. Poste d’abord dans Le Fil pour pouvoir importer.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding:16, borderTop:'1px solid rgba(255,255,255,.08)', display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={closeComposer} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'#fff', cursor:'pointer' }}>Annuler</button>
              <button
                onClick={publishStory}
                disabled={uploading || (!visualFile && !selectedImportUrl)}
                style={{
                  padding:'9px 22px', borderRadius:10, border:'none',
                  background: (visualFile || selectedImportUrl) ? 'linear-gradient(90deg,#d4a017,#f6d98a)' : '#333',
                  color: (visualFile || selectedImportUrl) ? '#111' : '#666', fontWeight:800, cursor: (visualFile || selectedImportUrl) ? 'pointer' : 'not-allowed'
                }}
              >
                {uploading ? 'Publication…' : 'Publier la story'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modale de rognage : remplace le fichier vidéo sélectionné par le segment */}
      {trimming && visualFile && (
        <VideoTrimmer
          file={visualFile}
          onCancel={() => setTrimming(false)}
          onDone={(clip) => {
            setTrimming(false)
            if (visualPreview) URL.revokeObjectURL(visualPreview)
            setVisualFile(clip)
            setVisualPreview(URL.createObjectURL(clip))
            setVisualIsVideo(true)
          }}
        />
      )}
    </div>
  )
}
