import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
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
const FADE = "linear-gradient(to bottom, transparent 0%, #000 90px, #000 calc(100% - 240px), rgba(0,0,0,0.55) calc(100% - 110px), transparent 100%)";

/** Couleur de la salle, partagée par la scène (lue à chaque image). */
type Room = { color: THREE.Color; pulse: number; sound: boolean; analyser: AnalyserNode | null };

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
  const room = useMemo<Room>(() => ({ color: new THREE.Color(items[0]?.accent ?? "#d9a35a"), pulse: 0, sound: false, analyser: null }), [items]);
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
    setTimeout(() => onPlay(item), 820);
  };

  const cur = items[active];
  const resume = cur.status && cur.status !== "Partie terminée" && !/champion/.test(cur.status);

  return (
    <div
      ref={wrap}
      className="ar3"
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
        dpr={[1, 1.6]}
        camera={{ position: [0, 0.3, CAM_Z], fov: 40 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0, maskImage: FADE, WebkitMaskImage: FADE }}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 7, 17]} />
        <Glow room={room} />
        <Dust room={room} />
        <Arc items={items} active={active} drag={dragOff} room={room} onPick={(i) => (dragged.current ? undefined : i === active ? enter(items[i]) : setActive(i))} />
        <Floor />
        <FloorSpill room={room} />
        <CameraRig dive={!!dive} drag={dragOff} />
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

      <AnimatePresence>
        {dive ? (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.45, duration: 0.35, ease: [0.7, 0, 0.84, 0] } }}
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
    const show = THREE.MathUtils.clamp(1.8 - Math.abs(rel), 0, 1);
    vis.current = show;
    g.visible = show > 0.01;
    onT.current += dt;
    const k = Math.min(1, onT.current / 0.55);
    const open = 1 - Math.pow(1 - k, 4);
    if (scr.current) scr.current.scale.y = active ? 0.02 + 0.98 * open : 1;
    if (mat.current) {
      // Éclat blanc à l'allumage, puis l'image ; légère respiration sur les basses.
      const flash = active ? (1 - open) * 1.4 : 0;
      const c = !tex ? 0.07 : 0.22 + 0.7 * near + flash + (active ? room.pulse * 0.06 : 0);
      mat.current.color.setScalar(c);
      mat.current.opacity = show;
    }
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
        <meshBasicMaterial key={tex?.uuid ?? "none"} ref={mat} map={tex ?? null} color={tex ? "#ffffff" : "#111317"} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -H / 2 - 0.09, 0.18]} raycast={() => null}>
        <planeGeometry args={[active ? W * 0.42 : W * 0.2, 0.012]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={active ? 1 : 0.35} />
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
    m.opacity = THREE.MathUtils.damp(m.opacity, (active ? 0.5 : 0.12) * vis.current, 4, dt);
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

// Poussière lumineuse dans le faisceau, teintée par l'écran.
function Dust({ room }: { room: Room }) {
  const COUNT = 380;
  const { geo, speed } = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const s = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      p[i * 3] = (Math.random() - 0.5) * 22;
      p[i * 3 + 1] = -1.5 + Math.random() * 6;
      p[i * 3 + 2] = -4 + Math.random() * 12;
      s[i] = 0.04 + Math.random() * 0.12;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return { geo: g, speed: s };
  }, []);
  const mat = useRef<THREE.PointsMaterial>(null);
  const white = useMemo(() => new THREE.Color("#ffffff"), []);
  useFrame((state, dt) => {
    const a = geo.attributes.position as THREE.BufferAttribute;
    const arr = a.array as Float32Array;
    const tt = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speed[i] * dt;
      arr[i * 3] += Math.sin(tt * 0.3 + i) * 0.0015;
      if (arr[i * 3 + 1] > 4.5) arr[i * 3 + 1] = -1.5;
    }
    a.needsUpdate = true;
    if (mat.current) {
      mat.current.color.copy(room.color).lerp(white, 0.4);
      mat.current.opacity = 0.65 + room.pulse * 0.35;
      mat.current.size = 0.034 * (1 + room.pulse * 0.6);
    }
  });
  return (
    <points geometry={geo}>
      <pointsMaterial ref={mat} size={0.034} sizeAttenuation transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
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
// même sur un écran très large et bas), léger balancement, plongée au clic.
function CameraRig({ dive, drag }: { dive: boolean; drag: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera, pointer, size } = useThree();
  const t0 = useRef<number | null>(null);
  useFrame((state, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    // Recul nécessaire pour que l'écran tienne en hauteur (55 %) et en largeur (62 %).
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // Portrait (téléphone) : l'écran prend presque toute la largeur, en haut.
    const portrait = aspect < 0.9;
    const dist = portrait ? W / (0.9 * 2 * tanH * aspect) : Math.max(H / (0.5 * 2 * tanH), W / (0.6 * 2 * tanH * aspect));
    const lookY = portrait ? -dist * tanH * 0.42 : -0.05;
    const baseZ = FRONT + dist;
    // Paysage : l'écran actif glisse à droite pour laisser la colonne de texte à gauche.
    const visW = 2 * tanH * dist * aspect;
    const pan = aspect > 1.1 ? -Math.max(0, Math.min(visW * 0.16, visW / 2 - W / 2 - 0.25)) : 0;
    if (dive) {
      if (t0.current == null) t0.current = state.clock.elapsedTime;
      const k = Math.min(1, (state.clock.elapsedTime - t0.current) / 0.8);
      const e = k * k * k;
      cam.position.z = THREE.MathUtils.lerp(baseZ, FRONT + 0.9, e);
      cam.position.y = THREE.MathUtils.lerp(0.3, 0, e);
      cam.fov = THREE.MathUtils.lerp(40, 76, e);
      cam.updateProjectionMatrix();
      cam.lookAt(0, 0, FRONT);
      return;
    }
    cam.position.z = THREE.MathUtils.damp(cam.position.z, baseZ, 3, dt);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, pan + pointer.x * 0.45, 2.5, dt);
    // Glissé vertical : la caméra monte ou plonge autour de l'arc (bascule).
    const tilt = THREE.MathUtils.clamp(drag.current.y * 0.006, -1.2, 1.8);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, 0.3 + pointer.y * 0.16 + tilt, drag.current.y ? 7 : 2.5, dt);
    cam.lookAt(pan, lookY, FRONT - 1.5);
  });
  return null;
}
