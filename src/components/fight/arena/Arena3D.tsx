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
  const drag = useRef<{ x: number; t: number } | null>(null);
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
      onPointerDown={(e) => (drag.current = { x: e.clientX, t: performance.now() })}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
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
        <Ring items={items} active={active} onPick={(i) => (i === active ? enter(items[i]) : setActive(i))} />
        <Floor />
        <CameraRig dive={!!dive} />
        <EffectComposer>
          <Bloom intensity={0.35} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.75} />
        </EffectComposer>
      </Canvas>

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

function Ring({ items, active, onPick }: { items: ArenaItem[]; active: number; onPick: (i: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const n = items.length;
  const step = (Math.PI * 2) / n;
  const target = useRef(0);
  // Rotation continue : on prend le chemin le plus court vers le portail visé.
  useEffect(() => {
    const want = -active * step;
    let t = target.current;
    while (want - t > Math.PI) t += Math.PI * 2;
    while (want - t < -Math.PI) t -= Math.PI * 2;
    target.current = t + (want - t);
  }, [active, step]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target.current, 4.2, dt);
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

function useMediaTexture(media: ArenaItem["media"]) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    let video: HTMLVideoElement | null = null;
    if (media.k === "video") {
      video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = `${media.src}#t=${media.start}`;
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (video && video.currentTime < media.start - 1) video.currentTime = media.start;
        },
        { once: true },
      );
      video.play().catch(() => {});
      const t = new THREE.VideoTexture(video);
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    } else {
      new THREE.TextureLoader().setCrossOrigin("anonymous").load(media.src, (t) => {
        if (!live) return t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      });
    }
    return () => {
      live = false;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [media]);
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
    if (mat.current) {
      const c = active ? 1 : 0.45;
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
        <meshBasicMaterial ref={mat} map={tex ?? undefined} color={tex ? "#ffffff" : "#111317"} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Un filet de couleur sous l'écran, la seule touche de l'univers. */}
      <mesh position={[0, -H / 2 - 0.09, 0.18]}>
        <planeGeometry args={[active ? W * 0.42 : W * 0.2, 0.012]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={active ? 1 : 0.4} />
      </mesh>
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
function CameraRig({ dive }: { dive: boolean }) {
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
    cam.position.y = THREE.MathUtils.damp(cam.position.y, 0.35 + pointer.y * 0.18, 2.5, dt);
    cam.lookAt(0, 0, R * 0.55);
  });
  return null;
}
