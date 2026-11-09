import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { EASE, FONT, LINE_2 } from "../identities";
import "./arena.css";

// L'arène du hub : une salle de projection. Les écrans des tournois phares
// sont rangés en arc ; l'écran actif est au centre, ses voisins sur les côtés.
// Derrière chaque écran, son image déborde sur le mur (ambilight), et toute
// la salle (halo, sol, poussière) prend la couleur de ce qui passe à l'écran.
// Un clic sur l'écran fait plonger la caméra dedans. Rotation automatique
// toutes les 12 s, en pause au survol. Chargée à la demande (lazy) ; le hub
// garde un panneau 2D si WebGL manque.

export type ArenaItem = {
  slug: string;
  title: string;
  tagline: string;
  path: string;
  kind: string;
  accent: string;
  status: string | null;
  media: { k: "video"; src: string; start: number } | { k: "img"; src: string };
  /** Image fixe du tournoi (écrans voisins). */
  still?: string;
  /** Ce qui passe à l'écran (titre, anime). */
  caption?: { title: string; sub?: string };
};

type Props = {
  items: ArenaItem[];
  onPlay: (item: ArenaItem) => void;
  onInfo: (item: ArenaItem) => void;
};

const W = 3.4;
const H = W * (9 / 16);
const FRONT = 4.8; // z de l'écran actif
const ARC = 6.4; // rayon de l'arc des écrans
const STEP = 0.62; // écart angulaire entre deux écrans
const CAM_Z = FRONT + 4.9;
const BG = "#08090d";
const ROTATE_MS = 12000;
const DIVE_MS = 1750;
const FADE = "linear-gradient(to bottom, transparent 0%, #000 90px, #000 calc(100% - 240px), rgba(0,0,0,0.55) calc(100% - 110px), transparent 100%)";

/** Couleur de la salle, partagée par la scène (lue à chaque image). */
type Room = { color: THREE.Color; pulse: number; sound: boolean; analyser: AnalyserNode | null; lamp: number; dive: number };

// Lampe du projecteur au changement de bobine : noir, deux battements, puis plein feu.
function lampAt(t: number) {
  if (t < 0.06) return 0;
  if (t < 0.11) return 0.85;
  if (t < 0.17) return 0.12;
  if (t < 0.25) return 1.05;
  if (t < 0.3) return 0.45;
  return Math.min(1, 0.7 + (t - 0.3) * 1.5);
}

// Le projecteur, derrière et au-dessus du public : son faisceau vise l'écran actif.
const LAMP = new THREE.Vector3(-1.2, 3.6, FRONT + 10);

// Son de l'écran actif : un seul contexte audio, créé au premier clic sur le
// bouton son (geste requis). Chaque vidéo est branchée une fois sur l'analyseur.
let audioCtx: AudioContext | null = null;
const wired = new WeakSet<HTMLVideoElement>();
function ensureAudio(room: Room) {
  if (!audioCtx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();
  }
  if (!room.analyser) {
    const an = audioCtx.createAnalyser();
    an.fftSize = 256;
    an.smoothingTimeConstant = 0.6;
    an.connect(audioCtx.destination);
    room.analyser = an;
  }
  audioCtx.resume().catch(() => {});
}
function wire(video: HTMLVideoElement, room: Room) {
  if (!audioCtx || !room.analyser || wired.has(video)) return;
  try {
    audioCtx.createMediaElementSource(video).connect(room.analyser);
    wired.add(video);
  } catch {
    /* déjà branchée ou refusée : le son passe quand même par la balise. */
  }
}
const bins = new Uint8Array(128);

export default function Arena3D({ items, onPlay, onInfo }: Props) {
  const [active, setActive] = useState(0);
  const [dive, setDive] = useState<ArenaItem | null>(null);
  const [visible, setVisible] = useState(true);
  const [hold, setHold] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragOff = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);
  const room = useMemo<Room>(() => ({ color: new THREE.Color(items[0]?.accent ?? "#d9a35a"), pulse: 0, sound: false, analyser: null, lamp: 1, dive: 0 }), [items]);
  const [sound, setSound] = useState(false);
  const toggleSound = () => {
    const on = !sound;
    if (on) ensureAudio(room);
    room.sound = on;
    setSound(on);
  };
  const n = items.length;
  const go = (d: number) => setActive((a) => (a + d + n) % n);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Rotation automatique : un tournoi toutes les 12 s, en pause au survol,
  // pendant un glissé, hors écran ou onglet caché.
  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    const v = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, []);
  // Pas de rotation pendant qu'on écoute : on laisse le refrain jouer.
  const running = visible && !hold && !dive && !tabHidden && !reduce && !sound;
  // Hors écran ou onglet caché : silence.
  useEffect(() => {
    room.sound = sound && visible && !tabHidden;
  }, [visible, tabHidden, sound, room]);
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => go(1), ROTATE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, running, n]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select") || dive) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, dive, n]);

  const enter = (item: ArenaItem) => {
    if (dive) return;
    setDive(item);
    setTimeout(() => onPlay(item), DIVE_MS);
  };

  const cur = items[active];
  const resume = cur.status && cur.status !== "Partie terminée" && !/champion/.test(cur.status);

  return (
    <div
      ref={wrap}
      className={`ar3 ${dive ? "is-diving" : ""}`}
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button, a")) return;
        drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        dragged.current = false;
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        dragOff.current = { x: e.clientX - d.x, y: e.clientY - d.y };
        if (Math.hypot(dragOff.current.x, dragOff.current.y) > 10) dragged.current = true;
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        dragOff.current = { x: 0, y: 0 };
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) >= Math.abs(dy)) go(dx < 0 ? 1 : -1);
        // Vertical : vers le haut = suivant, vers le bas = précédent.
        else if (Math.abs(dy) > 60) go(dy < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        drag.current = null;
        dragOff.current = { x: 0, y: 0 };
      }}
      onWheel={(e) => {
        if (Math.abs(e.deltaX) > 24 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) go(e.deltaX > 0 ? 1 : -1);
      }}
    >
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 2]}
        camera={{ position: [0, 0.3, CAM_Z], fov: 40 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0, maskImage: FADE, WebkitMaskImage: FADE }}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 7, 17]} />
        <Glow room={room} />
        <Beam room={room} />
        <BeamDust room={room} />
        <ScreenLight room={room} />
        <Arc items={items} active={active} drag={dragOff} room={room} onPick={(i) => (dragged.current ? undefined : i === active ? enter(items[i]) : setActive(i))} />
        <Floor />
        <FloorSpill room={room} />
        <Seats />
        <Curtains room={room} />
        <CameraRig dive={!!dive} drag={dragOff} room={room} />
        <EffectComposer>
          {/* Seuil haut : une image claire reste une image, pas une plaque blanche. */}
          <Bloom intensity={0.32} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.09} />
          <Vignette eskil={false} offset={0.22} darkness={0.7} />
        </EffectComposer>
      </Canvas>

      {/* Zone de l'écran central : clic = plonger dedans. */}
      <div aria-hidden className="ar3-hit" onClick={() => (dragged.current ? undefined : enter(cur))} />

      {/* Texte du tournoi actif. */}
      <div className="ar3-copy">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cur.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.22 } }}
          >
            <p className="ar3-kicker">
              <span aria-hidden style={{ background: cur.accent }} />
              {cur.kind}
              {cur.status ? <b>{cur.status}</b> : null}
            </p>
            <h1 className="ar3-title">
              {cur.title.split(" ").map((w, k, all) => (
                <motion.span
                  key={k}
                  initial={{ opacity: 0, y: "0.4em", filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE, delay: 0.06 + k * 0.07 } }}
                  style={{ display: "inline-block", marginRight: k < all.length - 1 ? "0.24em" : 0 }}
                >
                  {w}
                </motion.span>
              ))}
            </h1>
            <p className="ar3-tagline">{cur.tagline}</p>
            {cur.caption ? (
              <p className="ar3-now">
                <i aria-hidden className="ar3-eq" style={{ color: cur.accent }}>
                  <span />
                  <span />
                  <span />
                </i>
                <span>
                  À l’écran : <b>{cur.caption.title}</b>
                  {cur.caption.sub ? `, ${cur.caption.sub}` : ""}
                </span>
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>
        <div className="ar3-ctas">
          <motion.button type="button" whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }} onClick={() => enter(cur)} className="ar3-play" style={{ background: cur.accent }}>
            <Play size={17} fill="currentColor" />
            {resume ? "Reprendre" : "Jouer"}
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => onInfo(cur)} className="ar3-more" style={{ boxShadow: `inset 0 0 0 1px ${LINE_2}` }}>
            <Info size={17} />
            Plus d’infos
          </motion.button>
          {cur.media.k === "video" ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label={sound ? "Couper le son du générique" : "Écouter le générique à l’écran"}
              title={sound ? "Couper le son" : "Écouter le refrain"}
              className={`ar3-sound ${sound ? "is-on" : ""}`}
              style={{ boxShadow: `inset 0 0 0 1px ${sound ? cur.accent : LINE_2}`, color: sound ? cur.accent : "#f4f2ec" }}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </motion.button>
          ) : null}
        </div>
      </div>

      {/* Onglets des tournois, avec le temps qui reste avant le suivant. */}
      <div className="ar3-tabs" role="tablist" aria-label="Tournois à la une">
        {items.map((it, k) => (
          <button
            key={it.slug}
            type="button"
            role="tab"
            aria-selected={k === active}
            className={k === active ? "is-on" : ""}
            onClick={() => setActive(k)}
            style={{ "--acc": it.accent } as React.CSSProperties}
          >
            <small>{String(k + 1).padStart(2, "0")}</small>
            <span>{it.title.replace(/^Tournoi (des |d'|d’)/i, "").replace(/^OST de /, "")}</span>
            <i aria-hidden>
              <em key={`${it.slug}-${active}`} style={{ animationDuration: `${ROTATE_MS}ms`, animationPlayState: running ? "running" : "paused" }} />
            </i>
          </button>
        ))}
      </div>

      {/* Pendant la plongée, le reste de la page s'éteint autour de la salle. */}
      {dive ? <div aria-hidden className="ar3-dim" /> : null}
      <AnimatePresence>
        {dive ? (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: DIVE_MS / 1000 - 0.32, duration: 0.3, ease: [0.7, 0, 0.84, 0] } }}
            style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 60% at 50% 45%, ${cur.accent}66, #08090d 75%)`, pointerEvents: "none" }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── Scène ────────────────────────────────────────────────────────────

// Position continue de l'arc : on glisse vers le tournoi visé par le chemin le
// plus court ; chaque écran calcule sa place relative (−2 … 2) à partir d'elle.
function Arc({ items, active, drag, room, onPick }: { items: ArenaItem[]; active: number; drag: React.MutableRefObject<{ x: number; y: number }>; room: Room; onPick: (i: number) => void }) {
  const n = items.length;
  const target = useRef(active);
  const pos = useRef(active);
  useEffect(() => {
    const d = ((((active - target.current) % n) + n + n / 2) % n) - n / 2;
    target.current += d;
  }, [active, n]);
  useFrame((_, dt) => {
    pos.current = THREE.MathUtils.damp(pos.current, target.current - drag.current.x * 0.004, 4, dt);
  });
  return (
    <group>
      {items.map((it, i) => (
        <Screen key={it.slug} item={it} index={i} n={n} pos={pos} active={i === active} room={room} onClick={() => onPick(i)} />
      ))}
    </group>
  );
}

// Écran légèrement courbe : un plan dont les bords se replient vers le spectateur.
function useCurvedPlane() {
  return useMemo(() => {
    const g = new THREE.PlaneGeometry(W, H, 48, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setZ(i, x * x * 0.07);
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);
}

// Image → texture WebGL. Une image déjà en cache sans en-tête CORS est refusée
// par WebGL : deuxième essai hors cache.
function loadImageTexture(src: string, done: (t: THREE.Texture) => void) {
  const loader = new THREE.TextureLoader().setCrossOrigin("anonymous");
  const ok = (t: THREE.Texture) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    done(t);
  };
  loader.load(src, ok, undefined, () => loader.load(`${src}${src.includes("?") ? "&" : "?"}gl=1`, ok));
}

let haloTex: THREE.Texture | null = null;
function halo() {
  if (haloTex) return haloTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.35, "rgba(255,255,255,0.45)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
}

function useMediaTexture(media: ArenaItem["media"], poster?: string) {
  const src = media.src;
  const start = media.k === "video" ? media.start : 0;
  const kind = media.k;
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    let video: HTMLVideoElement | null = null;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    if (kind === "video") {
      video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.src = `${src}#t=${start}`;
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (video && video.currentTime < start - 1) video.currentTime = start;
        },
        { once: true },
      );
      if (poster) loadImageTexture(poster, (t) => (live ? setTex((cur) => cur ?? t) : t.dispose()));
      let swapped = false;
      const swap = () => {
        if (!live || !video || swapped) return;
        swapped = true;
        const t = new THREE.VideoTexture(video);
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      };
      video.addEventListener("loadeddata", swap, { once: true });
      fallback = setTimeout(swap, 4000);
      video.play().catch(() => {});
    } else {
      loadImageTexture(src, (t) => (live ? setTex(t) : t.dispose()));
    }
    return () => {
      live = false;
      if (fallback) clearTimeout(fallback);
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [kind, src, start, poster]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

// Couleur moyenne de l'image affichée (8×8 px), saturée un peu : la lumière de la salle.
const probe = typeof document !== "undefined" ? document.createElement("canvas") : null;
function averageColor(src: CanvasImageSource, out: THREE.Color) {
  if (!probe) return false;
  probe.width = 8;
  probe.height = 8;
  const g = probe.getContext("2d", { willReadFrequently: true });
  if (!g) return false;
  try {
    g.drawImage(src, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data;
    let r = 0;
    let gg = 0;
    let b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
    }
    out.setRGB(r / 64 / 255, gg / 64 / 255, b / 64 / 255, THREE.SRGBColorSpace);
    const hsl = { h: 0, s: 0, l: 0 };
    out.getHSL(hsl);
    out.setHSL(hsl.h, Math.min(1, hsl.s * 1.5 + 0.12), THREE.MathUtils.clamp(hsl.l, 0.35, 0.6));
    return true;
  } catch {
    return false;
  }
}

// Une image projetée : point chaud au centre, coins un peu plus sombres, comme une vraie toile.
function projected(sh: { fragmentShader: string }) {
  sh.fragmentShader = sh.fragmentShader.replace(
    "#include <map_fragment>",
    `#include <map_fragment>
#ifdef USE_MAP
{ vec2 q = (vMapUv - 0.5) * vec2(1.0, 1.35); diffuseColor.rgb *= mix(0.8, 1.05, smoothstep(0.85, 0.1, length(q))); }
#endif`,
  );
}

function Screen({ item, index, n, pos, active, room, onClick }: { item: ArenaItem; index: number; n: number; pos: React.MutableRefObject<number>; active: boolean; room: Room; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const geo = useCurvedPlane();
  // Seul l'écran actif lit sa vidéo ; les autres montrent leur image fixe.
  const media = useMemo<ArenaItem["media"]>(() => (active || item.media.k === "img" || !item.still ? item.media : { k: "img", src: item.still }), [active, item.media, item.still]);
  const tex = useMediaTexture(media, item.still);
  const [hover, setHover] = useState(false);
  const accent = useMemo(() => new THREE.Color(item.accent), [item.accent]);
  const sampled = useMemo(() => new THREE.Color(), []);
  const lastProbe = useRef(0);
  const vis = useRef(0);
  const scr = useRef<THREE.Mesh>(null);
  const matte = useRef<THREE.MeshBasicMaterial>(null);
  // Allumage : quand l'écran devient actif, il s'ouvre comme une télé qu'on allume.
  const onT = useRef(9);
  const first = useRef(true);
  useEffect(() => {
    if (active && !first.current) onT.current = 0;
    first.current = false;
  }, [active]);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    // Place relative dans l'arc, ramenée dans [−n/2, n/2).
    let rel = index - pos.current;
    rel = ((((rel + n / 2) % n) + n) % n) - n / 2;
    const a = rel * STEP;
    g.position.set(Math.sin(a) * ARC, 0, FRONT - ARC + Math.cos(a) * ARC);
    g.rotation.y = -a * 0.9;
    const near = Math.max(0, 1 - Math.abs(rel));
    const s = 0.8 + 0.2 * near + (active && hover ? 0.03 : 0);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 6, dt));
    // Au-delà d'un cran, l'écran s'efface dans le noir.
    const show = THREE.MathUtils.clamp(1.8 - Math.abs(rel), 0, 1) * (active ? 1 : 1 - Math.min(1, room.dive * 2.5));
    vis.current = show;
    g.visible = show > 0.01;
    onT.current += dt;
    // Changement de bobine : la lampe bat deux fois avant de rester allumée.
    const lamp = lampAt(onT.current);
    if (active) room.lamp = lamp;
    if (mat.current) {
      // L'écran n'a de lumière que celle du projecteur ; les voisins restent dans l'ombre.
      const lit = active ? 0.12 + 0.8 * lamp : 0.16 + 0.5 * near;
      const c = !tex ? 0.07 : lit + (active ? room.pulse * 0.06 : 0);
      mat.current.color.setScalar(c);
      mat.current.opacity = show;
    }
    if (matte.current) matte.current.opacity = show;
    // Son : seul l'écran actif parle, et la salle bat sur ses basses.
    const vid = tex?.image instanceof HTMLVideoElement ? tex.image : null;
    if (vid) {
      const speak = active && room.sound;
      if (speak && vid.muted) {
        wire(vid, room);
        vid.muted = false;
        vid.volume = 0.7;
        vid.play().catch(() => {});
      } else if (!speak && !vid.muted) vid.muted = true;
    }
    if (active) {
      let target = 0;
      if (room.sound && room.analyser && vid && !vid.paused) {
        room.analyser.getByteFrequencyData(bins);
        let b = 0;
        for (let i = 1; i < 7; i++) b += bins[i];
        target = Math.max(0, (b / 6 / 255 - 0.42) / 0.5);
      }
      // Attaque rapide, retombée douce.
      room.pulse = target > room.pulse ? THREE.MathUtils.lerp(room.pulse, target, 0.5) : THREE.MathUtils.damp(room.pulse, target, 5, dt);
    }
    // L'écran actif éclaire la salle de sa couleur (mesurée 3 fois par seconde).
    if (active && tex && state.clock.elapsedTime - lastProbe.current > 0.33) {
      lastProbe.current = state.clock.elapsedTime;
      const img = tex.image as CanvasImageSource | undefined;
      const ready = img && (!(img instanceof HTMLVideoElement) || img.readyState >= 2);
      if (ready && averageColor(img, sampled)) sampled.lerp(accent, 0.3);
    }
    if (active) room.color.lerp(sampled.r + sampled.g + sampled.b > 0 ? sampled : accent, 1 - Math.exp(-dt * 1.6));
  });

  return (
    <group ref={ref}>
      <Ambilight tex={tex} vis={vis} active={active} room={room} />
      <mesh
        ref={scr}
        geometry={geo}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        {/* Clé sur la texture : un matériau compilé sans map ne l'affiche jamais ensuite. */}
        <meshBasicMaterial key={tex?.uuid ?? "none"} ref={mat} map={tex ?? null} onBeforeCompile={projected} customProgramCacheKey={() => "projected"} color={tex ? "#ffffff" : "#111317"} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Cache noir autour de la toile, comme dans une vraie salle. */}
      <mesh geometry={geo} scale={[1.035, 1.06, 1]} position={[0, 0, -0.012]} raycast={() => null}>
        <meshBasicMaterial ref={matte} color="#030304" transparent toneMapped={false} />
      </mesh>
      <Sheen geo={geo} accent={accent} active={active} />
      <Frame accent={accent} active={active} vis={vis} />
    </group>
  );
}

// ── Ambilight ────────────────────────────────────────────────────────
// Un grand plan derrière l'écran, qui reprend SON image : flou large, couleurs
// des bords prolongées vers l'extérieur, fondu en ovale. Le mur s'éclaire de
// ce qui passe, image par image.
const AMBI_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const AMBI_FS = /* glsl */ `
uniform sampler2D map;
uniform float uOn;
uniform vec2 uScale;
varying vec2 vUv;
void main() {
  vec2 s = (vUv - 0.5) * uScale + 0.5;
  vec2 c = clamp(s, 0.02, 0.98);
  vec3 acc = vec3(0.0);
  float tot = 0.0;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5236;
    for (int j = 1; j <= 2; j++) {
      vec2 o = vec2(cos(a), sin(a) * 1.6) * 0.07 * float(j);
      acc += texture2D(map, clamp(c + o, 0.0, 1.0)).rgb;
      tot += 1.0;
    }
  }
  vec3 col = acc / tot;
  // Distance hors du cadre de l'écran : la lumière décroît en s'éloignant.
  vec2 q = max(abs(s - 0.5) - 0.5, 0.0);
  float d = length(q * vec2(1.0, 1.4));
  float fall = exp(-d * 3.2);
  // Fondu jusqu'à zéro sur les bords du plan : jamais de rectangle visible.
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = smoothstep(0.0, 0.32, e.x) * smoothstep(0.0, 0.3, e.y);
  // Une image très claire n'éclaire pas le mur en gris : on garde surtout la couleur.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 1.6) * (1.0 - 0.45 * smoothstep(0.55, 0.95, l));
  gl_FragColor = vec4(max(col, 0.0) * fall * edge * 0.85, 1.0) * uOn;
}
`;
function Ambilight({ tex, vis, active, room }: { tex: THREE.Texture | null; vis: React.MutableRefObject<number>; active: boolean; room: Room }) {
  const SX = 2.3;
  const SY = 2.6;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: AMBI_VS,
        fragmentShader: AMBI_FS,
        uniforms: { map: { value: null }, uOn: { value: 0 }, uScale: { value: new THREE.Vector2(SX, SY) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => {
    mat.uniforms.map.value = tex;
  }, [tex, mat]);
  useFrame((_, dt) => {
    const base = tex ? (active ? 0.62 : 0.2) * vis.current : 0;
    const want = active ? base * (1 + room.pulse * 0.9) + room.pulse * 0.2 : base;
    mat.uniforms.uOn.value = THREE.MathUtils.damp(mat.uniforms.uOn.value, want, room.pulse > 0.05 ? 14 : 3, dt);
  });
  return (
    <mesh position={[0, 0.05, -0.5]} material={mat} raycast={() => null}>
      <planeGeometry args={[W * SX, H * SY]} />
    </mesh>
  );
}

// ── Détails ──────────────────────────────────────────────────────────

const PERIM = 2 * (W + H);
function onFrame(t: number, out: THREE.Vector3) {
  let d = (((t % 1) + 1) % 1) * PERIM;
  const z = (x: number) => x * x * 0.07 + 0.012;
  if (d < W) return out.set(-W / 2 + d, H / 2, z(-W / 2 + d));
  d -= W;
  if (d < H) return out.set(W / 2, H / 2 - d, z(W / 2));
  d -= H;
  if (d < W) return out.set(W / 2 - d, -H / 2, z(W / 2 - d));
  d -= W;
  return out.set(-W / 2, -H / 2 + d, z(-W / 2));
}

function Frame({ accent, active, vis }: { accent: THREE.Color; active: boolean; vis: React.MutableRefObject<number> }) {
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) pts.push(onFrame(i / 160, new THREE.Vector3()));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ transparent: true, toneMapped: false }));
  }, []);
  useFrame((_, dt) => {
    const m = line.material as THREE.LineBasicMaterial;
    m.color.copy(accent);
    m.opacity = THREE.MathUtils.damp(m.opacity, (active ? 0.16 : 0.05) * vis.current, 4, dt);
  });
  return <primitive object={line} />;
}

// Reflet de verre : une bande de lumière oblique traverse l'écran actif toutes les ~7 s.
const SHEEN_VS = AMBI_VS;
const SHEEN_FS = /* glsl */ `
uniform float uT;
uniform float uOn;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  float p = -0.4 + 1.8 * clamp(uT / 1.6, 0.0, 1.0);
  float d = vUv.x + (vUv.y - 0.5) * 0.45 - p;
  float band = exp(-d * d * 260.0) + 0.35 * exp(-d * d * 18.0);
  vec2 e = min(vUv, 1.0 - vUv);
  float rim = (1.0 - smoothstep(0.0, 0.02, min(e.x, e.y * 1.8))) * 0.12;
  vec3 c = mix(vec3(1.0), uTint, 0.35);
  gl_FragColor = vec4(c * (band * 0.18 + rim), 1.0) * uOn;
}
`;
function Sheen({ geo, accent, active }: { geo: THREE.BufferGeometry; accent: THREE.Color; active: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SHEEN_VS,
        fragmentShader: SHEEN_FS,
        uniforms: { uT: { value: 99 }, uOn: { value: 0 }, uTint: { value: new THREE.Color() } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const clock = useRef(2.5);
  const was = useRef(active);
  useEffect(() => {
    if (active && !was.current) clock.current = 0;
    was.current = active;
  }, [active]);
  useFrame((_, dt) => {
    clock.current += dt;
    if (clock.current > 7) clock.current = 0;
    mat.uniforms.uT.value = clock.current;
    mat.uniforms.uOn.value = THREE.MathUtils.damp(mat.uniforms.uOn.value, active ? 1 : 0, 3, dt);
    (mat.uniforms.uTint.value as THREE.Color).copy(accent);
  });
  return <mesh geometry={geo} material={mat} position={[0, 0, 0.004]} raycast={() => null} />;
}

// Halo de la salle derrière l'arc : la couleur de l'image à l'écran.
function Glow({ room }: { room: Room }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    m.color.copy(room.color);
    m.opacity = 0.12 + Math.sin(state.clock.elapsedTime * 0.6) * 0.02 + room.pulse * 0.12;
  });
  return (
    <mesh position={[0, 0.1, -3]}>
      <planeGeometry args={[22, 7]} />
      <meshBasicMaterial ref={mat} map={halo()} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
}

// Lumière de l'écran sur le sol, devant lui.
function FloorSpill({ room }: { room: Room }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (!mat.current) return;
    mat.current.color.copy(room.color);
    mat.current.opacity = 0.32 + room.pulse * 0.3;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -H / 2 - 0.33, FRONT + 0.7]}>
      <planeGeometry args={[W * 1.6, 1.6]} />
      <meshBasicMaterial ref={mat} map={halo()} transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ── Salle de cinéma ──────────────────────────────────────────────────
// Le faisceau du projecteur : une pyramide qui part de la cabine et s'ouvre
// sur l'écran actif. Fumée qui dérive, rayons, bords doux ; il bat avec la
// lampe au changement de bobine et prend la couleur de l'image.
const BEAM_VS = /* glsl */ `
attribute float aV;
attribute float aUV;
varying float vV;
varying float vUV;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vView;
void main() {
  vV = aV;
  vUV = aUV;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vView = cameraPosition - w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const BEAM_FS = /* glsl */ `
uniform float uT;
uniform float uOn;
uniform vec3 uColor;
varying float vV;
varying float vUV;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vView;
float h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
  float v = vV;
  float u = vUV / max(v, 1e-4);
  // Bords du faisceau très doux : on ne voit jamais l'arête de la pyramide.
  float side = smoothstep(0.0, 0.3, u) * smoothstep(1.0, 0.7, u);
  // Plus dense près de la toile, s'efface vers la cabine (hors champ).
  float along = smoothstep(0.05, 0.4, v) * (1.0 - smoothstep(0.42, 0.88, v)) * 1.7;
  // Fumée qui monte doucement dans la lumière.
  vec3 p = vPos * 0.7 + vec3(0.0, -uT * 0.06, uT * 0.03);
  float smoke = n3(p) * 0.6 + n3(p * 2.3) * 0.3 + n3(p * 5.1) * 0.1;
  smoke = 0.35 + 1.2 * smoothstep(0.25, 0.8, smoke);
  // Rayons : stries fines qui partent de l'objectif.
  float rays = 0.72 + 0.28 * n3(vec3(u * 22.0, 0.0, uT * 0.15));
  // Une face vue par la tranche traverse plus de lumière.
  float thick = 1.0 - abs(dot(normalize(vN), normalize(vView)));
  float a = side * along * smoke * rays * (0.3 + 0.7 * thick);
  gl_FragColor = vec4(uColor * a * uOn, 1.0);
}
`;
function beamGeometry() {
  const c = [
    new THREE.Vector3(-W / 2, H / 2, FRONT),
    new THREE.Vector3(W / 2, H / 2, FRONT),
    new THREE.Vector3(W / 2, -H / 2, FRONT),
    new THREE.Vector3(-W / 2, -H / 2, FRONT),
  ];
  // Chaque face : de l'objectif (v=0) jusqu'à la toile (v=1), u en travers.
  const pos: number[] = [];
  const aV: number[] = [];
  const aUV: number[] = [];
  const SEG = 24;
  for (let f = 0; f < 4; f++) {
    const a = c[f];
    const b = c[(f + 1) % 4];
    for (let s = 0; s < SEG; s++) {
      const u0 = s / SEG;
      const u1 = (s + 1) / SEG;
      const p0 = a.clone().lerp(b, u0);
      const p1 = a.clone().lerp(b, u1);
      // Triangle lampe → deux points de la toile (u porté multiplié par v).
      pos.push(LAMP.x, LAMP.y, LAMP.z, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      aV.push(0, 1, 1);
      aUV.push(0, u0, u1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aV", new THREE.Float32BufferAttribute(aV, 1));
  g.setAttribute("aUV", new THREE.Float32BufferAttribute(aUV, 1));
  g.computeVertexNormals();
  return g;
}
function Beam({ room }: { room: Room }) {
  const geo = useMemo(beamGeometry, []);
  const white = useMemo(() => new THREE.Color("#fff6e8"), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BEAM_VS,
        fragmentShader: BEAM_FS,
        uniforms: { uT: { value: 0 }, uOn: { value: 0 }, uColor: { value: new THREE.Color() } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    mat.uniforms.uT.value = t;
    // Léger papillonnement de lampe à arc, plus les basses quand on écoute.
    const flick = 1 + Math.sin(t * 31) * 0.015 + Math.sin(t * 7.3) * 0.02;
    mat.uniforms.uOn.value = (0.42 + room.pulse * 0.18) * room.lamp * flick;
    (mat.uniforms.uColor.value as THREE.Color).copy(white).lerp(room.color, 0.5);
  });
  return <mesh geometry={geo} material={mat} raycast={() => null} frustumCulled={false} />;
}

// Poussière : seulement dans le faisceau, là où la lumière la révèle.
function BeamDust({ room }: { room: Room }) {
  const COUNT = 360;
  const { geo, seed } = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    // t (le long du faisceau), u, v (en travers), vitesse.
    const sd = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
      sd[i * 4] = 0.3 + Math.random() * 0.55;
      sd[i * 4 + 1] = Math.random();
      sd[i * 4 + 2] = Math.random();
      sd[i * 4 + 3] = 0.004 + Math.random() * 0.012;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return { geo: g, seed: sd };
  }, []);
  const mat = useRef<THREE.PointsMaterial>(null);
  const white = useMemo(() => new THREE.Color("#ffffff"), []);
  useFrame((state, dt) => {
    const arr = (geo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const tt = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const k = i * 4;
      // Dérive lente vers le haut, petit tourbillon.
      seed[k + 2] += seed[k + 3] * dt * 2.2;
      seed[k + 1] += Math.sin(tt * 0.4 + i) * 0.0006;
      if (seed[k + 2] > 1) {
        seed[k + 2] = 0;
        seed[k + 1] = Math.random();
        seed[k] = 0.3 + Math.random() * 0.55;
      }
      const t = seed[k];
      const x = (seed[k + 1] - 0.5) * W * 0.96;
      const y = (seed[k + 2] - 0.5) * H * 0.96;
      arr[i * 3] = LAMP.x + (x - LAMP.x) * t;
      arr[i * 3 + 1] = LAMP.y + (y - LAMP.y) * t;
      arr[i * 3 + 2] = LAMP.z + (FRONT - LAMP.z) * t;
    }
    geo.attributes.position.needsUpdate = true;
    if (mat.current) {
      mat.current.color.copy(room.color).lerp(white, 0.55);
      mat.current.opacity = (0.4 + room.pulse * 0.4) * room.lamp;
    }
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial ref={mat} map={halo()} size={0.028} sizeAttenuation transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

// La toile éclaire la salle : une lumière rectangulaire à sa place, de la
// couleur de l'image (les dossiers des fauteuils et le sol la reçoivent).
let rectReady = false;
function ScreenLight({ room }: { room: Room }) {
  const light = useRef<THREE.RectAreaLight>(null);
  if (!rectReady) {
    RectAreaLightUniformsLib.init();
    rectReady = true;
  }
  useEffect(() => {
    light.current?.lookAt(0, -0.4, FRONT + 6);
  }, []);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    l.color.copy(room.color);
    l.intensity = (5 + room.pulse * 5) * room.lamp;
  });
  return (
    <>
      <rectAreaLight ref={light} position={[0, 0, FRONT + 0.05]} width={W} height={H} intensity={5} />
      {/* Ce qui retombe du faisceau sur le haut des dossiers. */}
      <directionalLight position={[LAMP.x, LAMP.y, LAMP.z]} intensity={0.05} color="#ffe9cf" />
      <ambientLight intensity={0.02} />
    </>
  );
}

// Les rangées de fauteuils, vues de dos. Gradins : chaque rangée se cale
// sous la ligne de regard vers le bas de l'écran, quel que soit le cadrage.
const ROWS = [1.3, 1.85, 2.4, 2.95, 3.5];
const SEAT_GAP = 0.4;
const SEATS_PER_ROW = 27;
function Seats() {
  const geo = useMemo(() => new RoundedBoxGeometry(0.34, 0.44, 0.13, 4, 0.06), []);
  const arm = useMemo(() => new RoundedBoxGeometry(0.05, 0.22, 0.32, 2, 0.02), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1c0d11", roughness: 0.72, metalness: 0.05 }), []);
  const armMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#121014", roughness: 0.5, metalness: 0.3 }), []);
  const backs = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const b = backs.current;
    const a = arms.current;
    if (!b || !a) return;
    const d = Math.max(2, rest.z - FRONT);
    const cy = rest.y;
    let k = 0;
    ROWS.forEach((s, r) => {
      // Hauteur de la ligne œil → bas de l'écran, à cette distance.
      const line = -H / 2 + (cy + H / 2) * (s / d);
      const top = Math.min(line - 0.06, -0.5 + r * 0.14);
      const y = top - 0.22;
      const off = r % 2 ? SEAT_GAP / 2 : 0;
      for (let i = 0; i < SEATS_PER_ROW; i++) {
        const x = (i - (SEATS_PER_ROW - 1) / 2) * SEAT_GAP + off;
        // Rangées légèrement incurvées vers l'écran.
        const z = FRONT + s + x * x * 0.018;
        tmp.position.set(x, y, z);
        tmp.rotation.set(-0.12, -x * 0.04, 0);
        tmp.updateMatrix();
        b.setMatrixAt(k, tmp.matrix);
        tmp.position.set(x + SEAT_GAP / 2, y - 0.18, z - 0.13);
        tmp.rotation.set(0, 0, 0);
        tmp.updateMatrix();
        a.setMatrixAt(k, tmp.matrix);
        k++;
      }
    });
    b.instanceMatrix.needsUpdate = true;
    a.instanceMatrix.needsUpdate = true;
  });
  const total = ROWS.length * SEATS_PER_ROW;
  return (
    <>
      <instancedMesh ref={backs} args={[geo, mat, total]} raycast={() => null} frustumCulled={false} />
      <instancedMesh ref={arms} args={[arm, armMat, total]} raycast={() => null} frustumCulled={false} />
    </>
  );
}

// Rideaux de velours de part et d'autre de la toile, et lambrequin au-dessus.
// Vrais plis en relief, éclairés par l'image (lumière rasante sur les plis
// intérieurs) ; ils s'ouvrent quand on plonge dans l'écran.
function folds(w: number, h: number, depth: number, segX: number) {
  const g = new THREE.PlaneGeometry(w, h, segX, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // Plis plus serrés en haut (tringle), qui s'évasent vers le bas.
    const spread = 1 + (0.5 - y / h) * 0.35;
    p.setZ(i, depth * (Math.sin((x * 26) / spread) * 0.7 + Math.sin((x * 57) / spread + 1.3) * 0.3));
  }
  g.computeVertexNormals();
  return g;
}
const DRAPE_W = 1.35;
function Curtains({ room }: { room: Room }) {
  const side = useMemo(() => folds(DRAPE_W, 3.2, 0.055, 120), []);
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#5a0d18",
        roughness: 0.62,
        sheen: 1,
        sheenColor: new THREE.Color("#ff7d8c"),
        sheenRoughness: 0.35,
      }),
    [],
  );
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const x0 = W / 2 + 0.1 + DRAPE_W / 2;
  const spots = useMemo(
    () =>
      [-1, 1].map((sg) => {
        const l = new THREE.SpotLight("#ffb48a", 6, 7, 0.5, 1, 1.6);
        l.position.set(sg * (x0 - 0.4), 2.8, 1.8);
        l.target.position.set(sg * x0, 0, 0);
        return l;
      }),
    [x0],
  );
  useFrame(() => {
    // Ouverture à la plongée.
    const open = Math.pow(room.dive, 1.6) * 2.4;
    if (left.current) left.current.position.x = -x0 - open;
    if (right.current) right.current.position.x = x0 + open;
  });
  const y = -H / 2 - 0.35 + 1.6;
  return (
    <group position={[0, 0, FRONT + 0.32]}>
      <mesh ref={left} geometry={side} material={mat} position={[-x0, y, 0]} raycast={() => null} />
      <mesh ref={right} geometry={side} material={mat} position={[x0, y, 0]} raycast={() => null} />
      {/* Deux projecteurs de scène chauds qui lèchent les rideaux. */}
      {spots.map((l, i) => (
        <group key={i}>
          <primitive object={l} />
          <primitive object={l.target} />
        </group>
      ))}
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -H / 2 - 0.35, 0]}>
      <planeGeometry args={[40, 40]} />
      <MeshReflectorMaterial
        blur={[400, 120]}
        resolution={512}
        mixBlur={1}
        mixStrength={1.6}
        roughness={1}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#0a0b0f"
        metalness={0.5}
        mirror={0.45}
      />
    </mesh>
  );
}

// Caméra : cadrage adapté à l'écran (l'écran actif garde ~55 % de la hauteur,
// même sur un écran très large et bas), léger balancement.
// Au clic, plongée de jeu vidéo : la caméra décolle, tourne autour de l'écran
// en s'inclinant, revient pile en face et fonce dans l'image.
const DIVE_S = DIVE_MS / 1000;
// Position de repos de la caméra (les fauteuils se calent dessus, même pendant la plongée).
const rest = { y: 0.3, z: CAM_Z };
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function CameraRig({ dive, drag, room }: { dive: boolean; drag: React.MutableRefObject<{ x: number; y: number }>; room: Room }) {
  const { camera, pointer, size } = useThree();
  const t0 = useRef<number | null>(null);
  const from = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
  const look = useRef(new THREE.Vector3(0, 0, FRONT - 1.5));
  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const center = useMemo(() => new THREE.Vector3(0, 0, FRONT), []);
  useFrame((state, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    // Recul nécessaire pour que l'écran tienne en hauteur (55 %) et en largeur (62 %).
    const tanH = Math.tan(THREE.MathUtils.degToRad(20));
    // Portrait (téléphone) : l'écran prend presque toute la largeur, en haut.
    const portrait = aspect < 0.9;
    const dist = portrait ? W / (0.9 * 2 * tanH * aspect) : Math.max(H / (0.5 * 2 * tanH), W / (0.6 * 2 * tanH * aspect));
    const lookY = portrait ? -dist * tanH * 0.42 : -0.05;
    const baseZ = FRONT + dist;
    // Paysage : l'écran actif glisse à droite pour laisser la colonne de texte à gauche.
    const visW = 2 * tanH * dist * aspect;
    const pan = aspect > 1.1 ? -Math.max(0, Math.min(visW * 0.16, visW / 2 - W / 2 - 0.25)) : 0;
    if (dive) {
      const now = state.clock.elapsedTime;
      if (t0.current == null) {
        t0.current = now;
        from.current.pos.copy(cam.position);
        from.current.look.copy(look.current);
      }
      const k = Math.min(1, (now - t0.current) / DIVE_S);
      room.dive = k;
      const r0 = from.current.pos.distanceTo(center);
      // Orbite : jusqu'à ~70° sur le côté, puis retour de face pour l'entrée.
      const swing = Math.sin(Math.PI * Math.min(1, k / 0.82));
      const theta = -1.2 * swing;
      // Le rayon fond d'abord doucement, puis la caméra plonge dans la toile.
      const r = THREE.MathUtils.lerp(r0 * 0.92, r0 * 0.55, easeIO(Math.min(1, k / 0.75)));
      const plunge = Math.pow(THREE.MathUtils.clamp((k - 0.72) / 0.28, 0, 1), 2.2);
      const rr = THREE.MathUtils.lerp(r, 0.18, plunge);
      const y = 1.15 * swing + THREE.MathUtils.lerp(from.current.pos.y, 0, Math.min(1, k * 1.4)) * (1 - swing);
      tmpV.set(Math.sin(theta) * rr, y, FRONT + Math.cos(theta) * rr);
      // Départ en douceur depuis la position où l'on était.
      const blend = THREE.MathUtils.smoothstep(k, 0, 0.18);
      cam.position.lerpVectors(from.current.pos, tmpV, blend);
      look.current.lerpVectors(from.current.look, center, THREE.MathUtils.smoothstep(k, 0, 0.3));
      // Inclinaison dans le virage, comme un plan de caméra de jeu.
      cam.up.set(Math.sin(theta) * -0.22 * swing, 1, 0).normalize();
      // Le champ se resserre dans le virage puis s'ouvre en grand à l'entrée (effet de vitesse).
      cam.fov = 40 - 5 * swing + 52 * plunge;
      cam.updateProjectionMatrix();
      cam.lookAt(look.current);
      return;
    }
    t0.current = null;
    room.dive = 0;
    cam.up.set(0, 1, 0);
    if (Math.abs(cam.fov - 40) > 0.01) {
      cam.fov = 40;
      cam.updateProjectionMatrix();
    }
    cam.position.z = THREE.MathUtils.damp(cam.position.z, baseZ, 3, dt);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, pan + pointer.x * 0.45, 2.5, dt);
    // Glissé vertical : la caméra monte ou plonge autour de l'arc (bascule).
    const tilt = THREE.MathUtils.clamp(drag.current.y * 0.006, -1.2, 1.8);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, 0.3 + pointer.y * 0.16 + tilt, drag.current.y ? 7 : 2.5, dt);
    rest.y = cam.position.y;
    rest.z = cam.position.z;
    look.current.set(pan, lookY, FRONT - 1.5);
    cam.lookAt(look.current);
  });
  return null;
}
