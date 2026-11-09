import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Info, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EASE, FONT, LINE_2 } from "../identities";

// L'arène du hub : trois portails (OST, openings, endings) disposés en cercle
// dans une scène 3D sobre — noir, brouillard, reflet discret au sol, léger
// bloom. Le portail actif s'avance ; un clic fait plonger la caméra dedans.
// Chargée à la demande (lazy) ; le hub garde un panneau 2D si WebGL manque.

export type ArenaItem = {
  slug: string;
  title: string;
  tagline: string;
  path: string;
  kind: string;
  accent: string;
  status: string | null;
  media: { k: "video"; src: string; start: number } | { k: "img"; src: string };
  /** Image fixe du tournoi (panneaux du fond). */
  still?: string;
};

type Props = {
  items: ArenaItem[];
  onPlay: (item: ArenaItem) => void;
  onInfo: (item: ArenaItem) => void;
};

const R = 4.2;
const W = 3.4;
const H = W * (9 / 16);
const BG = "#08090d";

export default function Arena3D({ items, onPlay, onInfo }: Props) {
  const [active, setActive] = useState(0);
  const [dive, setDive] = useState<ArenaItem | null>(null);
  const [visible, setVisible] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; t: number } | null>(null);
  // Décalage du glissé en cours (px), lu à chaque image par la scène.
  const dragOff = useRef({ x: 0, y: 0 });
  // Un glissé ne doit pas se terminer en clic sur le portail (plongée involontaire).
  const dragged = useRef(false);
  const n = items.length;
  const go = (d: number) => setActive((a) => (a + d + n) % n);

  // Hors de l'écran (on a défilé plus bas), la scène s'arrête.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Flèches du clavier quand le hub est visible ; Entrée plonge.
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
    // La caméra plonge, le flash couvre la fin du trajet, puis on arrive sur le tournoi.
    setTimeout(() => onPlay(item), 820);
  };

  const cur = items[active];

  return (
    <div
      ref={wrap}
      style={{ position: "relative", height: "min(88dvh, 880px)", minHeight: 540, background: BG, overflow: "hidden", touchAction: "pan-y", userSelect: "none" }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        dragged.current = false;
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        // La scène suit le doigt : l'anneau tourne, la caméra bascule.
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
        // Horizontal : gauche / droite. Vertical : vers le haut = suivant.
        if (Math.abs(dx) > 50 && Math.abs(dx) >= Math.abs(dy)) go(dx < 0 ? 1 : -1);
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
        camera={{ position: [0, 0.35, R + 5.2], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 6.5, 15]} />
        <ambientLight intensity={0.6} />
        <Glow accent={cur.accent} />
        <Orbit items={items} active={active} drag={dragOff} />
        <Dust accent={cur.accent} />
        <Ring items={items} active={active} drag={dragOff} onPick={(i) => (dragged.current ? undefined : i === active ? enter(items[i]) : setActive(i))} />
        <Floor />
        <CameraRig dive={!!dive} drag={dragOff} />
        <EffectComposer>
          <Bloom intensity={0.35} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.75} />
        </EffectComposer>
      </Canvas>

      {/* Sur l'écran central, le doigt pilote la scène dans les deux sens
          (ailleurs, glisser verticalement fait défiler la page). Un appui plonge. */}
      <div
        aria-hidden
        onClick={() => (dragged.current ? undefined : enter(cur))}
        style={{ position: "absolute", left: "27%", right: "27%", top: "22%", bottom: "30%", touchAction: "none", cursor: "pointer" }}
      />

      {/* Texte du portail actif, en bas à gauche. */}
      <div style={{ position: "absolute", left: "clamp(20px, 4vw, 64px)", bottom: "clamp(36px, 8vh, 84px)", width: "min(520px, calc(100% - 40px))", pointerEvents: "none" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cur.slug}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
          >
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8b8a85" }}>
              <span aria-hidden style={{ width: 18, height: 1, background: cur.accent }} />
              {cur.kind}
              {cur.status ? (
                <>
                  <span aria-hidden style={{ width: 3, height: 3, borderRadius: 999, background: "#8b8a85" }} />
                  <span style={{ color: "#f4f2ec" }}>{cur.status}</span>
                </>
              ) : null}
            </p>
            <h1 style={{ margin: "14px 0 0", fontFamily: FONT.display, fontWeight: 700, fontSize: "clamp(38px, 4.6vw, 72px)", lineHeight: 0.98, letterSpacing: "-0.035em", color: "#f4f2ec" }}>{cur.title}</h1>
            <p style={{ margin: "14px 0 0", maxWidth: "44ch", fontFamily: FONT.body, fontSize: 16, lineHeight: 1.5, color: "#b9b7b1" }}>{cur.tagline}</p>
          </motion.div>
        </AnimatePresence>
        <div style={{ display: "flex", gap: 10, marginTop: 24, pointerEvents: "auto" }}>
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => enter(cur)}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 48, padding: "0 24px 0 20px", border: 0, borderRadius: 999, background: cur.accent, color: BG, fontFamily: FONT.body, fontWeight: 600, fontSize: 15, cursor: "pointer", transition: "background-color 0.4s" }}
          >
            <Play size={17} fill="currentColor" />
            {cur.status && cur.status !== "Partie terminée" && !/champion/.test(cur.status) ? "Reprendre" : "Jouer"}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onInfo(cur)}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 48, padding: "0 22px 0 18px", border: 0, borderRadius: 999, background: "rgba(8,9,13,0.5)", backdropFilter: "blur(12px)", boxShadow: `inset 0 0 0 1px ${LINE_2}`, color: "#f4f2ec", fontFamily: FONT.body, fontWeight: 500, fontSize: 15, cursor: "pointer" }}
          >
            <Info size={17} />
            Plus d'infos
          </motion.button>
        </div>
      </div>

      {/* Navigation : flèches et index, en bas à droite. */}
      <div style={{ position: "absolute", right: "clamp(20px, 4vw, 64px)", bottom: "clamp(36px, 8vh, 84px)", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontFamily: FONT.body, fontSize: 12, letterSpacing: "0.18em", color: "#8b8a85" }}>
          <span style={{ color: "#f4f2ec" }}>{String(active + 1).padStart(2, "0")}</span> / {String(n).padStart(2, "0")}
        </span>
        {[-1, 1].map((d) => (
          <motion.button
            key={d}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => go(d)}
            aria-label={d < 0 ? "Tournoi précédent" : "Tournoi suivant"}
            style={{ display: "grid", placeItems: "center", width: 42, height: 42, border: 0, borderRadius: 999, background: "rgba(8,9,13,0.5)", backdropFilter: "blur(12px)", boxShadow: `inset 0 0 0 1px ${LINE_2}`, color: "#f4f2ec", cursor: "pointer" }}
          >
            {d < 0 ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </motion.button>
        ))}
      </div>

      {/* Flash de fin de plongée. */}
      <AnimatePresence>
        {dive ? (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.45, duration: 0.35, ease: [0.7, 0, 0.84, 0] } }}
            style={{ position: "absolute", inset: 0, background: "#f4f2ec", pointerEvents: "none" }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── Scène ────────────────────────────────────────────────────────────

function Ring({ items, active, drag, onPick }: { items: ArenaItem[]; active: number; drag: React.MutableRefObject<{ x: number; y: number }>; onPick: (i: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const n = items.length;
  const step = (Math.PI * 2) / n;
  const target = useRef(0);
  // Rotation continue : depuis l'angle actuel, on prend le chemin le plus
  // court vers le portail visé (du dernier au premier = un seul cran).
  useEffect(() => {
    const want = -active * step;
    const TAU = Math.PI * 2;
    const cur = target.current;
    const d = ((((want - cur + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    target.current = cur + d;
  }, [active, step]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target.current + drag.current.x * 0.005, 4.2, dt);
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <Portal key={it.slug} item={it} angle={i * step} active={i === active} onClick={() => onPick(i)} />
      ))}
    </group>
  );
}

// Écran légèrement courbe : un plan dont les bords se replient vers le spectateur.
function useCurvedPlane() {
  return useMemo(() => {
    const g = new THREE.PlaneGeometry(W, H, 48, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, (x * x) * 0.07);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);
}

// Image → texture WebGL. Une image déjà affichée ailleurs (balise <img> sans
// CORS) reste en cache sans en-tête CORS : WebGL la refuse. Deuxième essai hors cache.
function loadImageTexture(src: string, done: (t: THREE.Texture) => void) {
  const loader = new THREE.TextureLoader().setCrossOrigin("anonymous");
  const ok = (t: THREE.Texture) => {
    t.colorSpace = THREE.SRGBColorSpace;
    done(t);
  };
  loader.load(src, ok, undefined, () => loader.load(`${src}${src.includes("?") ? "&" : "?"}gl=1`, ok));
}

function useStill(src: string | undefined) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    loadImageTexture(src, (t) => (live ? setTex(t) : t.dispose()));
    return () => {
      live = false;
    };
  }, [src]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

// Textures de dégradé dessinées une fois : halo rond, et masque doux pour
// fondre les grands panneaux du fond dans le noir.
let haloTex: THREE.Texture | null = null;
let maskTex: THREE.Texture | null = null;
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
function mask() {
  if (maskTex) return maskTex;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 288;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 512, 288);
  // Ellipse floue : plein au centre, rien sur les bords.
  g.filter = "blur(38px)";
  g.fillStyle = "#fff";
  g.beginPath();
  g.ellipse(256, 144, 190, 92, 0, 0, Math.PI * 2);
  g.fill();
  maskTex = new THREE.CanvasTexture(c);
  return maskTex;
}

function useMediaTexture(media: ArenaItem["media"]) {
  const src = media.src;
  const start = media.k === "video" ? media.start : 0;
  const kind = media.k;
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    let video: HTMLVideoElement | null = null;
    if (kind === "video") {
      video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = `${src}#t=${start}`;
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (video && video.currentTime < start - 1) video.currentTime = start;
        },
        { once: true },
      );
      video.play().catch(() => {});
      const t = new THREE.VideoTexture(video);
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    } else {
      loadImageTexture(src, (t) => (live ? setTex(t) : t.dispose()));
    }
    return () => {
      live = false;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  // La texture dépend de la source seule : un nouvel objet pour la même vidéo ne la recharge pas.
  }, [kind, src, start]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

function Portal({ item, angle, active, onClick }: { item: ArenaItem; angle: number; active: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const geo = useCurvedPlane();
  const tex = useMediaTexture(item.media);
  const [hover, setHover] = useState(false);
  const accent = useMemo(() => new THREE.Color(item.accent), [item.accent]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    // Le portail actif s'avance et grandit ; les autres reculent dans le brouillard.
    const s = active ? (hover ? 1.04 : 1) : 0.8;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 5, dt));
    const r = active ? R + 0.6 : R;
    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r;
    g.position.x = THREE.MathUtils.damp(g.position.x, x, 5, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, z, 5, dt);
    // Les portails des côtés pivotent à moitié vers la caméra : jamais vus de tranche.
    const ring = g.parent?.rotation.y ?? 0;
    const net = Math.atan2(Math.sin(angle + ring), Math.cos(angle + ring));
    g.rotation.y = angle - net * 0.45;
    if (mat.current) {
      // Sans texture, l'écran reste sombre (jamais une plaque blanche).
      const c = !tex ? 0.07 : active ? 1 : 0.45;
      mat.current.color.setScalar(THREE.MathUtils.damp(mat.current.color.r, c, 4, dt));
    }
  });

  return (
    <group ref={ref} position={[Math.sin(angle) * R, 0, Math.cos(angle) * R]} rotation={[0, angle, 0]}>
      <mesh
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
        {/* Clé sur la texture : un matériau compilé sans map ne l'affiche jamais
            ensuite (shader sans USE_MAP), d'où les écrans blancs. */}
        <meshBasicMaterial key={tex?.uuid ?? "none"} ref={mat} map={tex ?? null} color={tex ? "#ffffff" : "#111317"} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Un filet de couleur sous l'écran, la seule touche de l'univers. */}
      <mesh position={[0, -H / 2 - 0.09, 0.18]}>
        <planeGeometry args={[active ? W * 0.42 : W * 0.2, 0.012]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={active ? 1 : 0.4} />
      </mesh>
      <Rays accent={accent} active={active} />
      <Sheen geo={geo} accent={accent} active={active} />
      <Frame accent={accent} active={active} />
      {/* Flaque de lumière au sol, dans la couleur du tournoi. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -H / 2 - 0.33, 0.55]}>
        <planeGeometry args={[W * 1.1, 0.9]} />
        <meshBasicMaterial map={halo()} color={accent} transparent opacity={active ? 0.3 : 0.08} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Détails ──────────────────────────────────────────────────────────

// Point du contour de l'écran courbe, t ∈ [0, 1) (haut, droite, bas, gauche).
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

// Liseré fin autour de l'écran (plus vif sur l'écran actif).
function Frame({ accent, active }: { accent: THREE.Color; active: boolean }) {
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) pts.push(onFrame(i / 160, new THREE.Vector3()));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ transparent: true, toneMapped: false }));
  }, []);
  useFrame((_, dt) => {
    const m = line.material as THREE.LineBasicMaterial;
    m.color.copy(accent);
    m.opacity = THREE.MathUtils.damp(m.opacity, active ? 0.55 : 0.14, 4, dt);
  });
  return <primitive object={line} />;
}

// Reflet de verre : une bande de lumière oblique traverse l'écran actif toutes
// les ~7 s, comme une vitre qui accroche la lumière. Rien sur les autres écrans.
const SHEEN_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SHEEN_FS = /* glsl */ `
uniform float uT;
uniform float uOn;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  // Position de la bande : balaie de -0.4 à 1.4 en 1,6 s, puis repos.
  float p = -0.4 + 1.8 * clamp(uT / 1.6, 0.0, 1.0);
  float d = vUv.x + (vUv.y - 0.5) * 0.45 - p;
  float band = exp(-d * d * 260.0) + 0.35 * exp(-d * d * 18.0);
  // Bords de l'écran : un léger liseré de verre, toujours là.
  vec2 e = min(vUv, 1.0 - vUv);
  float rim = (1.0 - smoothstep(0.0, 0.02, min(e.x, e.y * 1.8))) * 0.12;
  vec3 c = mix(vec3(1.0), uTint, 0.35);
  gl_FragColor = vec4(c * (band * 0.22 + rim), 1.0) * uOn;
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
  useFrame((_, dt) => {
    clock.current += dt;
    if (clock.current > 7) clock.current = 0;
    mat.uniforms.uT.value = clock.current;
    mat.uniforms.uOn.value = THREE.MathUtils.damp(mat.uniforms.uOn.value, active ? 1 : 0, 3, dt);
    (mat.uniforms.uTint.value as THREE.Color).copy(accent);
  });
  return <mesh geometry={geo} material={mat} position={[0, 0, 0.004]} raycast={() => null} />;
}

// Rayons derrière l'écran actif : de longs faisceaux doux qui partent du haut
// et respirent lentement, dans la couleur du tournoi (lumière d'église, brume).
let rayTex: THREE.Texture | null = null;
function ray() {
  if (rayTex) return rayTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  const h = g.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, "rgba(255,255,255,0)");
  h.addColorStop(0.5, "rgba(255,255,255,1)");
  h.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = h;
  g.fillRect(0, 0, 64, 256);
  // Fondu vers le bas : le faisceau se perd dans la brume.
  g.globalCompositeOperation = "destination-in";
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, "rgba(0,0,0,1)");
  v.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = v;
  g.fillRect(0, 0, 64, 256);
  rayTex = new THREE.CanvasTexture(c);
  return rayTex;
}
const RAYS = [
  { x: -1.3, w: 0.55, a: 0.16, s: 0.7 },
  { x: -0.45, w: 0.9, a: 0.07, s: 0.45 },
  { x: 0.35, w: 0.4, a: -0.05, s: 0.9 },
  { x: 1.1, w: 0.75, a: -0.14, s: 0.55 },
  { x: 1.7, w: 0.3, a: -0.22, s: 1.1 },
];
function Rays({ accent, active }: { accent: THREE.Color; active: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const on = useRef(0);
  useFrame((state, dt) => {
    on.current = THREE.MathUtils.damp(on.current, active ? 1 : 0, 2.2, dt);
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, k) => {
      if (!m) return;
      const r = RAYS[k];
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.copy(accent);
      // Respiration lente et décalée de chaque faisceau.
      mat.opacity = on.current * (0.1 + 0.08 * Math.sin(t * r.s + k * 1.7));
      m.rotation.z = r.a + Math.sin(t * 0.13 + k) * 0.025;
    });
  });
  return (
    <group position={[0, H / 2 + 0.4, -0.35]}>
      {RAYS.map((r, k) => (
        <mesh key={k} ref={(m) => (refs.current[k] = m)} position={[r.x, -2.1, 0]} raycast={() => null}>
          <planeGeometry args={[r.w, 4.6]} />
          <meshBasicMaterial map={ray()} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// Deux grands panneaux au fond, à gauche et à droite : les tournois voisins
// de l'écran actif, fondus dans le noir, pris dans le reflet du sol.
// Second anneau, plus grand, derrière les écrans : une grande image fondue par
// tournoi, placée entre deux portails. Il tourne avec l'anneau mais en retard
// (profondeur), et chaque image s'efface quand elle passe devant la caméra.
const R2 = 8.6;
function Orbit({ items, active, drag }: { items: ArenaItem[]; active: number; drag: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const n = items.length;
  const step = (Math.PI * 2) / n;
  const target = useRef(0);
  useEffect(() => {
    const want = -active * step;
    const TAU = Math.PI * 2;
    const d = ((((want - target.current + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    target.current += d;
  }, [active, step]);
  useFrame((_, dt) => {
    const g = group.current;
    if (g) g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target.current + drag.current.x * 0.0035, 2.2, dt);
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <Pane key={it.slug} src={it.still} angle={i * step + step / 2} />
      ))}
    </group>
  );
}

function Pane({ src, angle }: { src?: string; angle: number }) {
  const tex = useStill(src);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const ref = useRef<THREE.Mesh>(null);
  const w = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const m = ref.current;
    if (!m || !mat.current) return;
    // Visible au fond, effacée en passant vers la caméra.
    m.getWorldPosition(w);
    const back = 1 - THREE.MathUtils.smoothstep(w.z, -2.5, 3);
    mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, tex ? 0.6 * back : 0, 3, dt);
    m.visible = mat.current.opacity > 0.01;
    // Dérive lente, comme une affiche qui respire.
    m.position.y = 1.1 + Math.sin(state.clock.elapsedTime * 0.25 + angle) * 0.08;
  });
  if (!tex) return null;
  return (
    <mesh ref={ref} position={[Math.sin(angle) * R2, 1.1, Math.cos(angle) * R2]} rotation={[0, angle + Math.PI, 0]}>
      <planeGeometry args={[8.4, 8.4 * (9 / 16)]} />
      <meshBasicMaterial ref={mat} map={tex} alphaMap={mask()} color="#8d8d8d" transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Halo coloré derrière l'anneau : la couleur du tournoi actif.
function Glow({ accent }: { accent: string }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo(() => new THREE.Color(accent), [accent]);
  useFrame((state, dt) => {
    const m = mat.current;
    if (!m) return;
    m.color.lerp(target, 1 - Math.exp(-dt * 2));
    m.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.6) * 0.03;
  });
  return (
    <mesh position={[0, 1.2, -5.5]}>
      <planeGeometry args={[18, 9]} />
      <meshBasicMaterial ref={mat} map={halo()} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
}

// Poussière lumineuse qui monte doucement, teintée par le tournoi actif.
function Dust({ accent }: { accent: string }) {
  const COUNT = 420;
  const { geo, speed } = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const s = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      p[i * 3] = (Math.random() - 0.5) * 20;
      p[i * 3 + 1] = -1.5 + Math.random() * 6;
      p[i * 3 + 2] = -6 + Math.random() * 13;
      s[i] = 0.04 + Math.random() * 0.12;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return { geo: g, speed: s };
  }, []);
  const mat = useRef<THREE.PointsMaterial>(null);
  const target = useMemo(() => new THREE.Color(accent).lerp(new THREE.Color("#ffffff"), 0.45), [accent]);
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
    mat.current?.color.lerp(target, 1 - Math.exp(-dt * 2));
  });
  return (
    <points geometry={geo}>
      <pointsMaterial ref={mat} size={0.035} sizeAttenuation transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
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
        mixStrength={1.4}
        roughness={1}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#0a0b0f"
        metalness={0.5}
        mirror={0.4}
      />
    </mesh>
  );
}

// Caméra : léger balancement au repos, plongée vers le portail au clic
// (avance + champ qui s'élargit, effet « dolly zoom »).
function CameraRig({ dive, drag }: { dive: boolean; drag: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera, pointer } = useThree();
  const t0 = useRef<number | null>(null);
  useFrame((state, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    if (dive) {
      if (t0.current == null) t0.current = state.clock.elapsedTime;
      const k = Math.min(1, (state.clock.elapsedTime - t0.current) / 0.8);
      const e = k * k * k;
      cam.position.z = THREE.MathUtils.lerp(R + 5.2, R + 1.1, e);
      cam.position.y = THREE.MathUtils.lerp(0.35, 0, e);
      cam.fov = THREE.MathUtils.lerp(42, 78, e);
      cam.updateProjectionMatrix();
      cam.lookAt(0, 0, R);
      return;
    }
    cam.position.x = THREE.MathUtils.damp(cam.position.x, pointer.x * 0.5, 2.5, dt);
    // Glissé vertical : la caméra monte ou descend autour de l'anneau (bascule 3D).
    const tilt = THREE.MathUtils.clamp(drag.current.y * 0.008, -1.4, 2.2);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, 0.35 + pointer.y * 0.18 + tilt, drag.current.y ? 6 : 2.5, dt);
    cam.lookAt(0, 0, R * 0.55);
  });
  return null;
}
