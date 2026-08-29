// ── Table de mixage du studio de doublage ───────────────────────────────────
// Deux traitements, montés à l'identique en écoute et à l'export :
//
//  1. Le retrait de la voix d'origine. On passe la piste en mid/side :
//     mid = (G+D)/2 porte ce qui est au centre — les dialogues y sont mixés
//     dans quasiment tous les doublages — et side = (G−D)/2 porte ce qui est
//     réparti dans l'image stéréo, c'est-à-dire la musique et les effets.
//     On creuse la bande de la voix (130 Hz – 7 kHz) dans le mid seulement,
//     puis on reconstruit G = mid + side, D = mid − side. Les graves et les
//     aigus du centre restent, donc la scène ne devient pas grêle.
//
//     Mesuré (voir la passe de vérification) : un signal centré perd 27 dB à
//     300 Hz, 62 dB à 1,2 kHz, 25 dB à 3,4 kHz — toute la bande qui porte
//     l'intelligibilité. Un signal réparti en stéréo ressort inchangé à 0 dB.
//
//  2. L'automation par répliques. Le creusement et l'atténuation ne sont
//     appliqués QUE pendant les répliques du script : entre deux lignes il n'y
//     a pas de dialogue à retirer, la musique reste donc intacte.
//
// Limite assumée : sur une piste mono ou quasi mono (G = D), le side est nul,
// il n'y a plus de séparation possible et creuser le mid enlève aussi la
// musique. `probeStereo` mesure ce cas pour qu'on le dise au lieu de le subir.

// ── Contexte partagé ────────────────────────────────────────────────────────
let _ctx = null
const _sources = new WeakMap()   // élément média → MediaElementAudioSourceNode

export function getContext() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!_ctx) {
    try { _ctx = new Ctx() } catch { return null }
    // Un contexte suspendu rend muet tout média qu'on y route : on le réveille
    // au premier geste.
    const wake = () => { if (_ctx.state === 'suspended') _ctx.resume().catch(() => {}) }
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(ev, wake, { passive: true })
    }
  }
  return _ctx
}

// createMediaElementSource n'est appelable qu'une fois par élément : au second
// appel le navigateur lève, et l'élément reste muet pour de bon.
export function mediaSource(ctx, el) {
  if (!ctx || !el) return null
  const known = _sources.get(el)
  if (known) return known
  try {
    const node = ctx.createMediaElementSource(el)
    _sources.set(el, node)
    return node
  } catch {
    return null
  }
}

// ── Fenêtres de réplique ────────────────────────────────────────────────────
// Les cues se chevauchent parfois (deux personnages qui se coupent). Deux
// rampes qui se croisent sur un même AudioParam donnent une automation
// incohérente : on fusionne d'abord.
export function speechWindows(cues, clipStart, { lead = 0.2, tail = 0.3 } = {}) {
  const raw = (cues || [])
    .map(c => [Math.max(0, c.start - clipStart - lead), Math.max(0, c.end - clipStart + tail)])
    .sort((a, b) => a[0] - b[0])

  const merged = []
  for (const [a, b] of raw) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1] + 0.05) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  return merged
}

// Applique la même courbe 0→1→0 à plusieurs AudioParam, chacun avec sa propre
// conversion (un gain qui monte, un autre qui descend).
export function scheduleWindows(targets, windows, when, ramp = 0.14) {
  for (const { param, idle, active } of targets) {
    param.cancelScheduledValues(0)
    param.setValueAtTime(idle, when)
  }
  for (const [a, b] of windows) {
    const inAt = when + a
    const outAt = when + b
    if (outAt <= inAt) continue
    for (const { param, idle, active } of targets) {
      param.setValueAtTime(idle, Math.max(when, inAt - ramp))
      param.linearRampToValueAtTime(active, inAt)
      param.setValueAtTime(active, outAt)
      param.linearRampToValueAtTime(idle, outAt + ramp)
    }
  }
}

// ── Mesure de niveau ────────────────────────────────────────────────────────
function meterOn(ctx, node) {
  const an = ctx.createAnalyser()
  an.fftSize = 1024
  an.smoothingTimeConstant = 0.1
  node.connect(an)
  const data = new Uint8Array(an.fftSize)
  return () => {
    an.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    return Math.sqrt(sum / data.length)
  }
}

// ── Chaîne « piste d'origine » ──────────────────────────────────────────────
// source → mid/side → creusement de la bande voix sur le mid → reconstruction
// → atténuation → sortie. `output` se branche où l'appelant veut.
const VOICE_LOW = 130     // Hz — sous cette limite on garde le centre (graves, kick)
const VOICE_HIGH = 7000   // Hz — au-dessus aussi (air, cymbales)

export function createOriginalChain(ctx, source) {
  const splitter = ctx.createChannelSplitter(2)
  source.connect(splitter)

  // mid = (G+D)/2, side = (G−D)/2. La somme se fait par convergence sur un
  // même nœud : c'est la façon Web Audio d'additionner deux signaux.
  const mid = ctx.createGain(); mid.gain.value = 1
  const side = ctx.createGain(); side.gain.value = 1

  const half = v => { const g = ctx.createGain(); g.gain.value = v; return g }
  const midL = half(0.5), midR = half(0.5)
  const sideL = half(0.5), sideR = half(-0.5)
  splitter.connect(midL, 0); midL.connect(mid)
  splitter.connect(midR, 1); midR.connect(mid)
  splitter.connect(sideL, 0); sideL.connect(side)
  splitter.connect(sideR, 1); sideR.connect(side)

  // Le mid éclaté en trois : graves gardés, aigus gardés, et le mid entier en
  // dérivation. Le mélange des trois donne le taux de retrait.
  //
  // Deux biquads en cascade par bande, avec les Q d'un Butterworth d'ordre 4
  // (0,5412 puis 1,3066) : bande passante plate et pente raide. Avec un seul
  // biquad, 300 Hz — la fondamentale d'une voix d'homme — ne descendait que de
  // 8 dB et la voix restait audible sous la musique.
  const BUTTER = [0.5412, 1.3066]
  const cascade = (type, freq) => {
    const nodes = BUTTER.map(q => {
      const f = ctx.createBiquadFilter()
      f.type = type
      f.frequency.value = freq
      f.Q.value = q
      return f
    })
    nodes[0].connect(nodes[1])
    return { input: nodes[0], output: nodes[1] }
  }

  const lowKeep = cascade('lowpass', VOICE_LOW)
  const highKeep = cascade('highpass', VOICE_HIGH)

  const gCut = ctx.createGain(); gCut.gain.value = 0     // poids du mid creusé
  const gCut2 = ctx.createGain(); gCut2.gain.value = 0
  const gFull = ctx.createGain(); gFull.gain.value = 1   // poids du mid entier

  const midOut = ctx.createGain()
  mid.connect(lowKeep.input); lowKeep.output.connect(gCut); gCut.connect(midOut)
  mid.connect(highKeep.input); highKeep.output.connect(gCut2); gCut2.connect(midOut)
  mid.connect(gFull); gFull.connect(midOut)

  // La bande qu'on retire, isolée : c'est presque exactement le dialogue
  // d'origine. On la mesure pour dessiner son enveloppe dans la frise.
  const dialHigh = cascade('highpass', VOICE_LOW)
  const dialLow = cascade('lowpass', VOICE_HIGH)
  mid.connect(dialHigh.input); dialHigh.output.connect(dialLow.input)

  // Reconstruction : G = mid + side, D = mid − side.
  const merger = ctx.createChannelMerger(2)
  const toL = half(1), toR = half(1), sToL = half(1), sToR = half(-1)
  midOut.connect(toL); toL.connect(merger, 0, 0)
  midOut.connect(toR); toR.connect(merger, 0, 1)
  side.connect(sToL); sToL.connect(merger, 0, 0)
  side.connect(sToR); sToR.connect(merger, 0, 1)

  const duck = ctx.createGain(); duck.gain.value = 1     // atténuation pendant les répliques
  const level = ctx.createGain(); level.gain.value = 1   // niveau général de l'ambiance
  merger.connect(duck); duck.connect(level)

  const readMid = meterOn(ctx, mid)
  const readSide = meterOn(ctx, side)
  const readDialogue = meterOn(ctx, dialLow.output)

  return {
    output: level,
    duckParam: duck.gain,
    levelParam: level.gain,
    // Les trois gains qui portent le taux de retrait, prêts à être automatisés.
    removalTargets(strength) {
      return [
        { param: gCut.gain, idle: 0, active: strength },
        { param: gCut2.gain, idle: 0, active: strength },
        { param: gFull.gain, idle: 1, active: 1 - strength },
      ]
    },
    setRemoval(strength) {
      gCut.gain.value = strength
      gCut2.gain.value = strength
      gFull.gain.value = 1 - strength
    },
    readMid,
    readSide,
    readDialogue,
  }
}

// Diagnostic honnête : le retrait n'a de sens que sur une vraie stéréo.
// ratio = énergie du side / énergie du mid.
//   > 0.10  → stéréo franche, le procédé fonctionne
//   0.02..0.10 → stéréo étroite, retrait partiel
//   < 0.02  → mono ou quasi mono : creuser le mid enlèverait aussi la musique
export function stereoVerdict(ratio) {
  if (ratio >= 0.1) return { level: 'ok', label: 'Stéréo franche', hint: 'La voix se retire proprement.' }
  if (ratio >= 0.02) return { level: 'weak', label: 'Stéréo étroite', hint: 'Retrait partiel : un reste de voix peut passer.' }
  return { level: 'mono', label: 'Piste quasi mono', hint: "Pas de séparation possible — seule l'atténuation par réplique s'applique." }
}

// ── Chaîne « ta voix » ──────────────────────────────────────────────────────
// Appliquée à la relecture ET à l'export, jamais à l'enregistrement : la prise
// reste brute, on peut donc changer de rendu après coup.
export const VOICE_PRESETS = {
  brute: {
    label: 'Brute',
    hint: 'Aucun traitement. Le micro tel quel.',
  },
  naturelle: {
    label: 'Naturelle',
    hint: 'Coupe les grondements, égalise un peu le niveau.',
    highpass: 80,
    compressor: { threshold: -24, knee: 14, ratio: 3, attack: 0.005, release: 0.22 },
    presence: { freq: 3000, gain: 2, q: 0.8 },
    makeup: 1.25,
  },
  studio: {
    label: 'Studio',
    hint: 'Voix posée, sifflantes adoucies, niveau tenu.',
    highpass: 100,
    warmth: { freq: 200, gain: 1.5, q: 0.7 },
    presence: { freq: 2800, gain: 3, q: 0.9 },
    deEss: { freq: 7200, gain: -3.5, q: 1.4 },
    compressor: { threshold: -26, knee: 12, ratio: 5, attack: 0.004, release: 0.18 },
    makeup: 1.5,
  },
  cartoon: {
    label: 'Dessin animé',
    hint: 'Très compressée et présente, comme un doublage télé.',
    highpass: 120,
    presence: { freq: 3400, gain: 5, q: 1 },
    deEss: { freq: 7500, gain: -4, q: 1.4 },
    compressor: { threshold: -30, knee: 8, ratio: 8, attack: 0.003, release: 0.14 },
    makeup: 1.8,
  },
}

export function createVoiceProcessor(ctx, presetKey) {
  const preset = VOICE_PRESETS[presetKey] || VOICE_PRESETS.brute
  const input = ctx.createGain()
  let tail = input

  const link = node => { tail.connect(node); tail = node }

  if (preset.highpass) {
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = preset.highpass; hp.Q.value = 0.7
    link(hp)
  }
  for (const [key, type] of [['warmth', 'peaking'], ['presence', 'peaking'], ['deEss', 'peaking']]) {
    const band = preset[key]
    if (!band) continue
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = band.freq
    f.gain.value = band.gain
    f.Q.value = band.q
    link(f)
  }
  if (preset.compressor) {
    const c = ctx.createDynamicsCompressor()
    for (const [k, v] of Object.entries(preset.compressor)) c[k].value = v
    link(c)
  }

  const output = ctx.createGain()
  output.gain.value = preset.makeup || 1
  tail.connect(output)

  return { input, output }
}

// Ramène une prise à un niveau de crête cible : une prise enregistrée trop bas
// donnait un montage inaudible à côté de la musique.
export function peakGain(buffer, target = 0.89) {
  let peak = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i += 8) {
      const v = Math.abs(data[i])
      if (v > peak) peak = v
    }
  }
  if (peak < 0.0005) return 1          // prise vide : ne pas amplifier le souffle
  return Math.min(8, target / peak)
}

// ── Décompte sonore ─────────────────────────────────────────────────────────
// Trois brèves, puis une plus grave sur le départ — le repère des cabines de
// doublage. Généré, aucun fichier à charger.
export function scheduleCountIn(ctx, destination, when, beats = 3) {
  for (let i = 0; i < beats; i++) {
    const at = when - (beats - i) * 0.5
    if (at < ctx.currentTime) continue
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.value = i === beats - 1 ? 1600 : 1000
    osc.connect(g); g.connect(destination)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(0.18, at + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09)
    osc.start(at); osc.stop(at + 0.12)
  }
}
