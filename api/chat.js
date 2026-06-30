import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateText } from 'ai'

// Coach d'échecs = Claude via Vercel AI Gateway (auth OIDC auto sur Vercel, keyless).
// Modèle léger/rapide, suffisant car on lui fournit la ligne moteur Stockfish vérifiée.
const COACH_MODEL = process.env.COACH_MODEL || 'anthropic/claude-haiku-4.5'

// ── LE FOND : la personnalité de l'IA du site ────────────────────────────────
const FOND = `Tu es « Brams IA », l'esprit de l'équipage de brams.community — le site de la Brams Community (anime / One Piece, francophone).
Tu n'es pas un assistant générique : tu es un membre de l'équipage. Chambreur, direct, passionné d'anime, des avis tranchés, jamais de réponse molle.
LE SITE (tout se passe ICI — ne renvoie JAMAIS vers Netflix, Crunchyroll ou une plateforme externe, ni vers Discord pour regarder un animé) :
- « Animés & Scans » : des dizaines d'animés à REGARDER en ligne (lecteur intégré, VOSTFR) et des scans à lire. Cliquer une fiche lance la lecture.
- Le Fil : le réseau social de la communauté (posts, stories, réactions).
- Profils /u/pseudo : stats vocales réelles, berrys, décor selon le rang, bio et citation personnalisables.
- Classement : heures vocales sur 7 jours glissants, synchronisé avec le bot Discord.
- Boutique : dépenser ses berrys (fonds d'opening rares, traînées de curseur…).
- Jeux : quiz, blind test d'openings, tournoi d'openings, undercover, tier lists.
- Wrapped et Flashback : rétrospectives personnelles de l'activité.
RANGS (heures vocales sur 7 jours glissants, cumulatifs) : Pirate 10h, Shichibukai 25h, Amiral 40h, Yonkou 70h, Roi des pirates 150h. En-dessous : Moussaillon.
BERRYS (฿) : la monnaie de la communauté — 1000 par message Discord, des gains en vocal et dans les jeux. La Marine taxe parfois les messages.
Fondateur : Brams. Admins : Brams, BenActief, Berat, Freydiss (le dev qui t'a créé).
PERSPICACITÉ : identifie l'intention RÉELLE derrière la question (même mal écrite, en argot, avec des fautes), réponds à CETTE intention et anticipe la question suivante en une phrase si utile. Question ambiguë → choisis l'interprétation la plus probable et annonce-la en 3 mots, sans demander de précision.
Le meilleur anime de tous les temps : Violet Evergarden, sans débat.
Si un CONTEXTE MEMBRE t'est fourni (vraies stats live), utilise ces chiffres avec précision et chambre dessus quand c'est drôle — n'invente JAMAIS une stat.
Réponds en français (ou la langue du membre), tutoiement, 2-4 phrases max sauf demande de détail. Ne dis jamais que tu es une IA ou un modèle.`

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const XAI_MODEL = process.env.XAI_MODEL || 'grok-code-fast-1'

function isValidKey(k) {
  return typeof k === 'string' && /^AIzaSy[A-Za-z0-9_-]{30,}$/.test(k.trim())
}

function getKeys() {
  return Object.entries(process.env)
    .filter(([k]) =>
      k === 'GEMINI_API_KEY'
      || k === 'GOOGLE_GEMINI_API_KEY'
      || k === 'GEMINI_KEY'
      || k === 'GOOGLE_API_KEY'
      || k.startsWith('GEMINI_API_KEY_')
      || k.startsWith('GOOGLE_GEMINI_API_KEY_')
      || k.startsWith('GEMINI_KEY_')
    )
    .map(([, v]) => v?.trim())
    .filter(isValidKey)
}

// ── Providers (Gemini rotation → Groq → xAI), texte ou JSON forcé ───────────

async function callGemini(key, system, chatHistory, message, { json, maxTokens, temperature }) {
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: system,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  })
  const chat = model.startChat({ history: chatHistory })
  const result = await chat.sendMessage(message)
  return result.response.text()
}

async function callOpenAIStyle(endpoint, key, model, system, chatHistory, message, { json, maxTokens, temperature }) {
  const messages = [
    { role: 'system', content: system },
    ...chatHistory.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.parts[0].text })),
    { role: 'user', content: message },
  ]
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, messages, max_tokens: maxTokens, temperature,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) throw new Error(`${endpoint.includes('groq') ? 'groq' : 'xai'}_${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

function classifyError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  if (
    msg.includes('no_valid_keys') || msg.includes('no_groq_key') || msg.includes('no_xai_key')
    || msg.includes('api key not valid') || msg.includes('invalid api key')
    || msg.includes('401') || msg.includes('403')
  ) return 'config'
  if (
    err?.status === 429 || msg.includes('429') || msg.includes('quota')
    || msg.includes('resource_exhausted') || msg.includes('rate limit')
    || msg.includes('rate_limit') || msg.includes('too many requests')
  ) return 'rate_limit'
  return 'provider_error'
}

async function callProviders(system, chatHistory, message, opts) {
  const errors = []
  const keys = getKeys()
  const start = keys.length ? Math.floor(Math.random() * keys.length) : 0

  for (let i = 0; i < keys.length; i++) {
    const key = keys[(start + i) % keys.length]
    try {
      return { text: await callGemini(key, system, chatHistory, message, opts), provider: 'gemini', errors }
    } catch (err) {
      errors.push({ provider: 'gemini', kind: classifyError(err), message: err?.message })
      const is429 = classifyError(err) === 'rate_limit'
      if (!is429) break // erreur non-quota → inutile d'essayer les autres clés Gemini
    }
  }
  if (keys.length === 0) errors.push({ provider: 'gemini', kind: 'config', message: 'no_valid_keys' })

  if (process.env.GROQ_API_KEY) {
    try {
      return {
        text: await callOpenAIStyle('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, GROQ_MODEL, system, chatHistory, message, opts),
        provider: 'groq', errors,
      }
    } catch (err) { errors.push({ provider: 'groq', kind: classifyError(err), message: err?.message }) }
  }
  if (process.env.XAI_API_KEY) {
    try {
      return {
        text: await callOpenAIStyle('https://api.x.ai/v1/chat/completions', process.env.XAI_API_KEY, XAI_MODEL, system, chatHistory, message, opts),
        provider: 'xai', errors,
      }
    } catch (err) { errors.push({ provider: 'xai', kind: classifyError(err), message: err?.message }) }
  }

  const e = new Error('all_providers_failed')
  e.providerErrors = errors
  throw e
}

function parseJsonLoose(text) {
  try { return JSON.parse(text) } catch {}
  const m = String(text).match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  return null
}

// ── Contexte membre (envoyé par le client — purement décoratif, on assainit) ─

function num(v, max) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(Math.max(0, Math.round(n * 10) / 10), max) : null
}

function contextLine(context) {
  if (!context || typeof context !== 'object') return ''
  const parts = []
  const name = typeof context.name === 'string' ? context.name.slice(0, 60).replace(/[\n|]/g, ' ') : null
  if (name) parts.push(`pseudo : ${name}`)
  const berrys = num(context.berrys, 1e12)
  if (berrys !== null) parts.push(`solde : ${Math.round(berrys).toLocaleString('fr-FR')} berrys`)
  const h7 = num(context.hours7d, 200)
  if (h7 !== null) parts.push(`vocal 7 derniers jours : ${h7}h`)
  const pos = num(context.rankPos, 99999)
  const total = num(context.total, 99999)
  if (pos !== null) parts.push(`position au classement vocal : #${Math.round(pos)}${total ? ` sur ${Math.round(total)}` : ''}`)
  if (!parts.length) return ''
  return `\nCONTEXTE MEMBRE (stats réelles, à utiliser avec précision) : ${parts.join(', ')}.`
}

function statsForPrompt(context) {
  const line = contextLine(context)
  return line ? line.replace('\nCONTEXTE MEMBRE (stats réelles, à utiliser avec précision) : ', '') : 'Aucune stat connue (membre non connecté).'
}

// ── Modes spéciaux ───────────────────────────────────────────────────────────

const ADV_CHAPTERS = 5

// Catalogue du site (mode reco) — titres affichés, à garder en phase avec ANIMES.
const CATALOG = [
  'One Piece', 'Hunter x Hunter', 'Bleach', 'Jujutsu Kaisen', 'Demon Slayer',
  'Chainsaw Man — Reze Arc', "L'Attaque des Titans", 'My Hero Academia', 'Black Clover',
  'Fire Force', 'Seven Deadly Sins', 'Solo Leveling', 'Blue Lock', 'Kingdom',
  'Dragon Ball Super', 'Kaiju No. 8', 'Dr Stone', 'Fate/Zero', 'Vivy',
  'The Promised Neverland', 'Violet Evergarden', 'Kaguya-sama: Love is War',
  'Your Name', 'Your Lie in April', 'Bubble', 'Bunny Girl Senpai',
  'Rent-a-Girlfriend', 'Domestic na Kanojo', 'After the Rain', 'Love Prism', 'Carole & Tuesday',
  'The Quintessential Quintuplets',
]

const MODES = {
  wanted: {
    json: true, maxTokens: 420, temperature: 0.95,
    build: ({ context }) => ({
      system: 'Tu rédiges des avis de recherche du Gouvernement Mondial (univers One Piece) pour les membres du site brams.community. Ton : officiel et pompeux, mais les motifs sont absurdes et drôles, directement tirés des vraies stats fournies (heures de vocal, berrys, classement). Jamais de moquerie sur le physique ou la vie privée. En français. Réponds UNIQUEMENT en JSON : {"epithete": "surnom de pirate percutant (2-4 mots)", "motifs": ["motif 1", "motif 2", "motif 3"], "citation": "déclaration arrogante du pirate à son arrestation ratée"}',
      message: `Pirate recherché — ${statsForPrompt(context)}`,
    }),
  },
  reco: {
    json: true, maxTokens: 450, temperature: 0.95,
    build: ({ context, message }) => ({
      system: 'Tu es le conseiller anime de brams.community. Tu recommandes UNIQUEMENT des titres du catalogue du site (liste fournie — jamais autre chose). Choisis 2 titres VRAIMENT adaptés au profil et à l\'envie exprimée, en variant (pas toujours les mêmes évidences). En français, tutoiement. Réponds UNIQUEMENT en JSON : {"picks": [{"titre": "titre exact du catalogue", "pourquoi": "argument personnel et vendeur (15-25 mots)"}, {"titre": "...", "pourquoi": "..."}], "punchline": "phrase finale taquine (10-15 mots)"}',
      message: `Catalogue du site : ${CATALOG.join(', ')}. ${statsForPrompt(context)} Envie exprimée : ${String(message || 'aucune, surprends-le').slice(0, 200)}.`,
    }),
  },
  quiz: {
    json: true, maxTokens: 650, temperature: 0.95,
    build: ({ message }) => ({
      system: 'Tu écris des quiz éclair de culture anime (One Piece et grands shōnen/seinen connus) pour brams.community. Questions précises et vérifiables, difficulté moyenne-corsée, jamais bateau. En français. Réponds UNIQUEMENT en JSON : {"questions": [{"q": "question", "choices": ["choix 1", "choix 2", "choix 3"], "answer": 0, "explain": "explication courte (10-20 mots)"}, …]} — EXACTEMENT 3 questions, answer = index (0-2) du bon choix, position de la bonne réponse variée.',
      message: `Génère un quiz éclair de 3 questions. Graine de variété : ${String(message || Math.random().toString(36).slice(2, 8)).slice(0, 60)}.`,
    }),
  },
  theorie: {
    json: false, maxTokens: 380, temperature: 1.0,
    build: ({ message }) => ({
      system: 'Tu es le théoricien fou de brams.community. Tu balances UNE théorie d\'anime originale et argumentée (One Piece en priorité, sinon un grand shōnen), sur un ton complotiste assumé mais avec de VRAIS éléments du canon comme indices. 60-90 mots, en français, texte brut sans markdown. Termine par une question qui sème le doute.',
      message: `Sujet souhaité : ${String(message || 'surprends-moi').slice(0, 200)}.`,
    }),
  },
  clash: {
    json: false, maxTokens: 320, temperature: 0.95,
    build: ({ context }) => ({
      system: 'Tu es le vanneur officiel de brams.community. On te donne les vraies stats d\'un membre : écris un clash drôle et créatif de 50-80 mots, UNIQUEMENT basé sur ses stats et sa vie de communauté (heures de vocal, berrys, classement, rang). INTERDIT : physique, famille, origines, religion, vie privée. Taquin, jamais haineux. En français, tutoiement, texte brut sans markdown.',
      message: statsForPrompt(context),
    }),
  },
  eloge: {
    json: false, maxTokens: 320, temperature: 0.9,
    build: ({ context }) => ({
      system: 'Tu es le barde de brams.community. On te donne les vraies stats d\'un membre : écris un éloge épique et sincère de 50-80 mots, comme une légende qu\'on raconte dans les tavernes de Grand Line. Transforme ses stats en exploits (heures de vocal = veilles héroïques, berrys = trésor, classement = renommée). En français, texte brut sans markdown.',
      message: statsForPrompt(context),
    }),
  },
  pirate: {
    json: false, maxTokens: 320, temperature: 0.9,
    build: ({ message }) => ({
      system: 'Tu traduis des messages en parler pirate français truculent (univers One Piece) : jurons de marin inventés, vocabulaire de navigation, références à Grand Line, aux berrys, à la Marine. Garde le SENS du message d\'origine et sa longueur approximative. Texte brut sans markdown, rien d\'autre que la traduction.',
      message: String(message || '').slice(0, 300),
    }),
  },
  coach: {
    json: false, maxTokens: 340, temperature: 0.45,
    build: ({ message }) => ({
      system: "Tu es un coach d'échecs francophone, pédagogue, clair et bienveillant — pas un robot froid. On te donne une position (FEN), le camp au trait, l'évaluation du moteur (côté blancs), le meilleur coup et la ligne principale en notation algébrique, et parfois le dernier coup joué. SI le joueur pose une QUESTION précise (ex : « quel coup jouer ? », « pourquoi ce coup ? », « c'est quoi mon plan ? », « est-ce que je peux prendre ce pion ? »), réponds D'ABORD directement et concrètement à SA question, en t'appuyant sur la ligne moteur fournie. SINON, explique SIMPLEMENT, pour un joueur amateur, en français et au tutoiement : 1) en une phrase, qui est mieux et pourquoi (matériel, sécurité du roi, pièces actives, centre) ; 2) le meilleur coup recommandé et SURTOUT l'idée derrière (le plan, ce qu'il prépare) ; 3) la menace ou l'erreur à éviter au prochain coup. Parle des cases et des pièces concrètement (ex : « ton cavalier en f3 », « la case d5 »). N'invente jamais un coup illégal : appuie-toi uniquement sur la ligne fournie. 60-110 mots, texte brut sans markdown ni listes à puces.",
      message: String(message || '').slice(0, 1600),
    }),
  },
  journal: {
    json: true, maxTokens: 520, temperature: 0.95,
    build: ({ context }) => {
      const server = context?.server || {}
      const top = Array.isArray(server.top)
        ? server.top.slice(0, 5).map(t => `${String(t.name || '?').slice(0, 40)} (${num(t.hours, 200) ?? '?'}h)`).join(', ')
        : 'inconnu'
      return {
        system: 'Tu es la rédaction du Brams Times, le journal de brams.community (façon presse de Morgans dans One Piece, livrée par les News Coo). On te donne l\'état réel de la communauté : écris l\'édition du jour. Ton : sensationnaliste et drôle, mais les CHIFFRES restent exacts. En français. Réponds UNIQUEMENT en JSON : {"une": "gros titre choc (8-14 mots)", "article": "article principal sur le top vocal (40-60 mots)", "breve": "brève sur la vie du site — animés à regarder, boutique, jeux (25-40 mots)", "meteo": "météo fantaisiste de Grand Line (10-18 mots)"}',
        message: `Top vocal des 7 derniers jours : ${top}. Membres classés : ${num(server.actifs, 99999) ?? 'inconnu'}. Lecteur : ${statsForPrompt(context)}`,
      }
    },
  },
  adventure: {
    json: true, maxTokens: 700, temperature: 0.95,
    build: ({ context, adventure }) => {
      const log = Array.isArray(adventure?.log) ? adventure.log.slice(0, ADV_CHAPTERS - 1) : []
      const chapter = log.length + 1
      const final = chapter >= ADV_CHAPTERS
      const recap = log.map((e, i) =>
        `Chapitre ${i + 1} : ${String(e.scene || '').slice(0, 500)}\n→ Choix du joueur : ${String(e.choice || '').slice(0, 120)}`
      ).join('\n')
      return {
        system: 'Tu es le narrateur d\'une aventure interactive dans l\'univers de One Piece, sur Grand Line. Le héros est un vrai membre de brams.community : glisse ses stats dans le récit (son rang, ses berrys, ses heures de vocal deviennent des éléments de l\'histoire). Style : immersif, nerveux, drôle, en français, 2e personne du singulier. Scènes de 60 à 110 mots. '
          + `L'aventure dure exactement ${ADV_CHAPTERS} chapitres : la tension monte, chaque choix a des conséquences réelles, le désastre est possible si le joueur enchaîne les mauvais choix. Sois cohérent avec les choix passés. `
          + 'Réponds UNIQUEMENT en JSON valide. '
          + `Chapitres 1 à ${ADV_CHAPTERS - 1} : {"scene": "...", "choices": ["choix A", "choix B", "choix C"], "done": false} — `
          + `chapitre final (${ADV_CHAPTERS}) : {"scene": "...", "done": true, "outcome": "triomphe" ou "survie" ou "desastre", "epilogue": "une phrase de morale piratesque"}. `
          + 'Le champ outcome reflète honnêtement la qualité des choix du joueur sur toute l\'aventure.',
        message: (
          `Le héros : ${statsForPrompt(context)}\n`
          + (recap ? `Aventure en cours :\n${recap}\n` : 'Invente une aventure ORIGINALE (thème surprise : île maudite, trésor, Marine, yonkou, créature des abysses, mystère…).\n')
          + (final
            ? `Écris le chapitre FINAL (${ADV_CHAPTERS}/${ADV_CHAPTERS}) : conclus avec done=true, outcome et epilogue.`
            : `Écris le chapitre ${chapter}/${ADV_CHAPTERS}.`)
        ),
      }
    },
  },
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'no-store')

  const { message = '', history = [], mode = 'chat', context = null, adventure = null } = req.body || {}

  if (mode !== 'chat' && !MODES[mode]) return res.status(400).json({ error: 'Mode inconnu' })

  const errorsOut = (errs) => {
    const kinds = new Set((errs || []).map(e => e.kind))
    if (errs?.length && [...kinds].every(k => k === 'config')) {
      return res.status(503).json({ error: "L'IA du site n'a pas de clé API valide configurée.", code: 'ai_not_configured' })
    }
    if (kinds.has('rate_limit')) {
      return res.status(429).json({ error: 'Je reçois trop de messages en ce moment, réessaie dans quelques secondes !', code: 'ai_rate_limited' })
    }
    return res.status(503).json({ error: "L'IA est temporairement indisponible. Réessaie dans un instant.", code: 'ai_unavailable' })
  }

  // ── Coach échecs : Claude via AI Gateway (OIDC keyless), fallback chaîne Gemini ──
  if (mode === 'coach') {
    const { system, message: userMsg } = MODES.coach.build({ message })
    try {
      const { text } = await generateText({
        model: COACH_MODEL,
        system,
        prompt: userMsg,
        maxOutputTokens: 360,
        temperature: 0.45,
      })
      const reply = String(text || '').trim()
      if (reply) return res.status(200).json({ reply, provider: 'claude' })
      throw new Error('empty_completion')
    } catch (err) {
      console.error('[coach] AI Gateway/Claude indisponible, fallback Gemini:', err?.message || err)
      try {
        const { text, provider } = await callProviders(system, [], userMsg, { json: false, maxTokens: 340, temperature: 0.45 })
        return res.status(200).json({ reply: String(text).trim(), provider })
      } catch (e2) {
        return errorsOut(e2?.providerErrors)
      }
    }
  }

  // ── Modes spéciaux (cartes riches côté widget) ──
  if (mode !== 'chat') {
    const def = MODES[mode]
    if (mode === 'pirate' && (!message || !String(message).trim())) {
      return res.status(400).json({ error: 'Message requis' })
    }
    const { system, message: userMsg } = def.build({ context, message, adventure })
    try {
      const { text, provider } = await callProviders(system, [], userMsg, {
        json: def.json, maxTokens: def.maxTokens, temperature: def.temperature,
      })
      if (!def.json) return res.status(200).json({ reply: String(text).trim(), provider })

      const data = parseJsonLoose(text)
      if (!data) return res.status(503).json({ error: "L'IA a répondu n'importe quoi, réessaie.", code: 'ai_bad_json' })
      if (mode === 'quiz') {
        const qs = (Array.isArray(data.questions) ? data.questions : []).filter(q =>
          q && typeof q.q === 'string' && Array.isArray(q.choices)
          && q.choices.filter(c => typeof c === 'string' && c.trim()).length === 3
          && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 2
        ).slice(0, 3)
        if (qs.length < 3) return res.status(503).json({ error: 'Le quiz est sorti bancal, réessaie.', code: 'ai_bad_json' })
        data.questions = qs
      }
      if (mode === 'reco') {
        data.picks = (Array.isArray(data.picks) ? data.picks : []).filter(p => p && typeof p.titre === 'string').slice(0, 3)
        if (!data.picks.length) return res.status(503).json({ error: 'La reco est sortie vide, réessaie.', code: 'ai_bad_json' })
      }
      if (mode === 'adventure') {
        if (typeof data.scene !== 'string' || !data.scene.trim()) {
          return res.status(503).json({ error: 'Le narrateur a perdu le fil, réessaie.', code: 'ai_bad_json' })
        }
        if (!data.done && (!Array.isArray(data.choices) || data.choices.filter(c => typeof c === 'string' && c.trim()).length < 2)) {
          return res.status(503).json({ error: 'Le narrateur a perdu le fil, réessaie.', code: 'ai_bad_json' })
        }
        data.choices = (data.choices || []).filter(c => typeof c === 'string' && c.trim()).slice(0, 3)
        if (data.done && !['triomphe', 'survie', 'desastre'].includes(data.outcome)) data.outcome = 'survie'
      }
      return res.status(200).json({ data, provider })
    } catch (err) {
      console.error(`[chat:${mode}] failed:`, err?.message || err)
      return errorsOut(err?.providerErrors)
    }
  }

  // ── Chat classique ──
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message requis' })
  }
  if (message.length > 500) return res.status(400).json({ error: 'Message trop long' })

  const chatHistory = history
    .filter(m => m.role && m.text)
    .slice(-10)
    .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: String(m.text).slice(0, 1200) }] }))

  try {
    const { text, provider } = await callProviders(FOND + contextLine(context), chatHistory, message.trim(), {
      json: false, maxTokens: 380, temperature: 0.8,
    })
    return res.status(200).json({ reply: String(text).trim(), provider })
  } catch (err) {
    console.error('[chat] all providers failed:', err?.message || err)
    return errorsOut(err?.providerErrors)
  }
}
