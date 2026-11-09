import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { DeckProps, SelectItem } from "./select-screen";
import { cover, loadImage } from "./holo-deck";

// Les tournois en écrans géants disposés en anneau autour de toi. On les fait
// défiler au doigt ou à la souris, 1:1, avec l'élan du geste : la caméra
// penche dans les virages, l'objectif s'ouvre avec la vitesse, les écrans
// ondulent et l'image se dédouble en RVB. Validation : travelling compensé
// (la caméra fonce dans l'écran pendant que l'objectif s'ouvre).

const PW = 4.6;
const PH = (PW * 9) / 16;
const TW = 1024;
const TH = 576;
const GAP = 0.55;

// ── Ressort (amortissement / réponse, façon Apple) ───────────────────
const RESPONSE = 0.42;
const DAMPING = 0.86;
const OMEGA = (2 * Math.PI) / RESPONSE;

const wrap = (d: number, n: number) => ((((d + n / 2) % n) + n) % n) - n / 2;

type Motion = {
  s: number; // position du défilé, en écrans
  v: number; // vitesse, écrans / s
  tgt: number;
  drag: { x: number; s: number; hist: { x: number; t: number }[]; moved: boolean } | null;
  unit: number; // pixels pour un écran
  lastPick: number;
};

// ── Shaders ──────────────────────────────────────────────────────────
const VS = /* glsl */ `
uniform float uVel;
uniform float uCurve;
uniform float uT;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  // Écran incurvé vers toi, et qui ondule avec la vitesse du défilé.
  p.z += p.x * p.x * uCurve;
  p.z += sin(uv.x * 3.14159) * uVel * 0.07;
  p.x += (uv.y - 0.5) * uVel * 0.06;
  p.y += sin(uv.x * 6.2832 + uT * 3.0) * abs(uVel) * 0.012;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;
const FS = /* glsl */ `
uniform sampler2D uTex;
uniform sampler2D uVid;
uniform float uMix;
uniform float uFocus;
uniform float uHover;
uniform float uVel;
uniform float uT;
uniform float uRefl;
uniform float uWarp;
uniform vec3 uAcc;
varying vec2 vUv;
float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 pick(vec2 uv) { return mix(texture2D(uTex, uv).rgb, texture2D(uVid, uv).rgb, uMix); }
void main() {
  vec2 uv = vUv;
  // Dédoublement RVB proportionnel à la vitesse (et au plongeon).
  float ca = clamp(uVel, -6.0, 6.0) * 0.0045 + uWarp * 0.012 * (uv.x - 0.5);
  vec3 col;
  col.r = pick(uv + vec2(ca, 0.0)).r;
  col.g = pick(uv).g;
  col.b = pick(uv - vec2(ca, 0.0)).b;
  float lit = mix(0.14, 1.0, max(uFocus, uHover * 0.5));
  // Les écrans de côté s'éteignent vers leur bord extérieur.
  lit *= mix(0.55, 1.0, uFocus) + (1.0 - uFocus) * 0.45 * (1.0 - abs(uv.x - 0.5) * 2.0);
  col *= lit;
  // Liseré de la couleur du tournoi.
  vec2 e = min(uv, 1.0 - uv) * vec2(16.0, 9.0);
  float edge = min(e.x, e.y);
  col += uAcc * smoothstep(0.09, 0.0, edge) * (0.25 + 0.75 * uFocus);
  col += uAcc * smoothstep(0.9, 0.0, edge) * 0.12 * uFocus;
  // Reflet qui balaie l'écran au premier plan.
  float band = uv.x + (1.0 - uv.y) * 0.35 - fract(uT * 0.09) * 2.6 + 0.4;
  col += exp(-band * band * 60.0) * 0.1 * uFocus;
  // Lignes d'écran et grain, discrets.
  col *= 0.96 + 0.04 * sin(uv.y * 900.0);
  col += (rnd(uv * 700.0 + fract(uT)) - 0.5) * 0.035;
  float a = 1.0;
  if (uRefl > 0.5) {
    a = smoothstep(0.42, 0.0, uv.y) * 0.2 * lit;
    col *= 0.8;
  }
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;

// ── Face d'un écran : l'image + numéro et nom en petit ───────────────
function paint(g: CanvasRenderingContext2D, it: SelectItem, idx: number, im: HTMLImageElement | null) {
  g.fillStyle = "#0d0e12";
  g.fillRect(0, 0, TW, TH);
  if (im) cover(g, im, im.naturalWidth, im.naturalHeight, 0, 0, TW, TH);
  const f = g.createLinearGradient(0, TH * 0.55, 0, TH);
  f.addColorStop(0, "rgba(8,9,12,0)");
  f.addColorStop(1, "rgba(8,9,12,0.7)");
  g.fillStyle = f;
  g.fillRect(0, 0, TW, TH);
  g.textBaseline = "alphabetic";
  g.fillStyle = it.accent;
  g.font = '700 22px "Geist Mono", ui-monospace, monospace';
  g.fillText(String(idx + 1).padStart(2, "0"), 36, TH - 38);
  g.fillStyle = "rgba(244,242,236,0.9)";
  g.font = '700 22px "Geist Mono", ui-monospace, monospace';
  g.fillText(it.short.toUpperCase(), 86, TH - 38);
}

function Panel({ item, idx, n, R, m, active, sound, warp, onPick, onGo }: { item: SelectItem; idx: number; n: number; R: number; m: React.MutableRefObject<Motion>; active: boolean; sound: boolean; warp: React.MutableRefObject<number>; onPick: () => void; onGo: () => void }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(PW, PH, 40, 12), []);
  const { ctx, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TW;
    c.height = TH;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { ctx: c.getContext("2d")!, tex: t };
  }, []);
  const mats = useMemo(() => {
    const mk = (refl: number) =>
      new THREE.ShaderMaterial({
        vertexShader: VS,
        fragmentShader: FS,
        transparent: refl > 0,
        depthWrite: refl === 0,
        side: THREE.DoubleSide,
        uniforms: {
          uTex: { value: tex },
          uVid: { value: tex },
          uMix: { value: 0 },
          uFocus: { value: 0 },
          uHover: { value: 0 },
          uVel: { value: 0 },
          uT: { value: 0 },
          uRefl: { value: refl },
          uWarp: { value: 0 },
          uCurve: { value: 0.035 },
          uAcc: { value: new THREE.Color(item.accent) },
        },
      });
    return [mk(0), mk(1)];
  }, [tex, item.accent]);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let live = true;
    let im: HTMLImageElement | null = null;
    const draw = () => {
      if (!live) return;
      paint(ctx, item, idx, im);
      tex.needsUpdate = true;
    };
    draw();
    loadImage(item.still).then((x) => {
      im = x;
      draw();
    });
    document.fonts?.ready.then(draw);
    return () => {
      live = false;
    };
  }, [item, idx, ctx, tex]);

  // Écran au premier plan : le générique joue dedans.
  const vid = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!active || item.media.k !== "video") return;
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    const start = item.media.start;
    v.src = `${item.media.src}#t=${start}`;
    v.addEventListener("loadedmetadata", () => {
      if (v.currentTime < start - 1) v.currentTime = start;
    });
    const vt = new THREE.VideoTexture(v);
    vt.colorSpace = THREE.SRGBColorSpace;
    v.play().catch(() => {});
    vid.current = v;
    for (const mt of mats) mt.uniforms.uVid.value = vt;
    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
      vid.current = null;
      vt.dispose();
    };
  }, [active, item, mats]);
  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    v.muted = !sound;
    if (sound) {
      v.volume = 0.7;
      v.play().catch(() => {});
    }
  }, [sound, active]);

  const g = useRef<THREE.Group>(null);
  const step = (Math.PI * 2) / n;
  useFrame((state, dt) => {
    const grp = g.current;
    if (!grp) return;
    const M = m.current;
    const d = wrap(idx - M.s, n);
    const a = d * step;
    const focus = 1 - THREE.MathUtils.smoothstep(Math.abs(d), 0, 1);
    // Sur l'anneau, tourné vers le centre ; petite houle verticale.
    grp.position.set(Math.sin(a) * R, Math.sin(d * 1.3) * 0.18 - (1 - focus) * 0.12, -Math.cos(a) * R);
    grp.rotation.set(0, -a, d * 0.02);
    grp.scale.setScalar(1 + focus * 0.05);
    grp.visible = Math.abs(a) < Math.PI * 0.62;
    const v = vid.current;
    const k = 1 - Math.exp(-dt * 6);
    for (const mt of mats) {
      const u = mt.uniforms;
      u.uT.value = state.clock.elapsedTime;
      u.uVel.value = THREE.MathUtils.clamp(M.v, -6, 6);
      u.uFocus.value = focus;
      u.uHover.value = THREE.MathUtils.lerp(u.uHover.value, hover ? 1 : 0, k);
      u.uMix.value = THREE.MathUtils.lerp(u.uMix.value, active && v && v.readyState >= 2 ? 1 : 0, 1 - Math.exp(-dt * 3));
      u.uWarp.value = active ? warp.current : 0;
    }
  });

  return (
    <group ref={g}>
      <mesh
        geometry={geo}
        material={mats[0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (m.current.drag?.moved) return;
          if (active) onGo();
          else onPick();
        }}
      />
      {/* Reflet sur le sol noir. */}
      <mesh geometry={geo} material={mats[1]} position={[0, -PH - 0.08, 0]} scale={[1, -1, 1]} raycast={() => null} />
    </group>
  );
}

// Traînées de lumière entre toi et les écrans : quasi immobiles au repos,
// elles s'étirent avec la vitesse.
function Streaks({ m, n, R, color }: { m: React.MutableRefObject<Motion>; n: number; R: number; color: string }) {
  const COUNT = 260;
  const seed = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        a: Math.random() * Math.PI * 2,
        r: R * (0.45 + Math.random() * 0.9),
        y: (Math.random() - 0.5) * 7,
      })),
    [R],
  );
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 6), 3));
    return g;
  }, []);
  const mat = useRef<THREE.LineBasicMaterial>(null);
  const tc = useMemo(() => new THREE.Color(color), [color]);
  useFrame((_, dt) => {
    const M = m.current;
    const step = (Math.PI * 2) / n;
    const p = geo.attributes.position.array as Float32Array;
    const vel = THREE.MathUtils.clamp(M.v, -8, 8);
    for (let i = 0; i < COUNT; i++) {
      const s = seed[i];
      // Les plus proches défilent moins vite : parallaxe.
      const par = s.r / R;
      const a0 = s.a - M.s * step * par;
      const a1 = a0 + vel * step * 0.09 * par + 0.004;
      p.set([Math.sin(a0) * s.r, s.y, -Math.cos(a0) * s.r, Math.sin(a1) * s.r, s.y, -Math.cos(a1) * s.r], i * 6);
    }
    geo.attributes.position.needsUpdate = true;
    if (mat.current) {
      mat.current.opacity = THREE.MathUtils.lerp(mat.current.opacity, 0.12 + Math.min(0.6, Math.abs(vel) * 0.12), 1 - Math.exp(-dt * 8));
      mat.current.color.lerp(tc, 1 - Math.exp(-dt * 3));
    }
  });
  return (
    <lineSegments geometry={geo} raycast={() => null} frustumCulled={false}>
      <lineBasicMaterial ref={mat} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

// Caméra au centre de l'anneau. Le centre optique est décalé (à droite en
// paysage, en haut en portrait) pour laisser la place au texte.
function Rig({ m, R, ready }: { m: React.MutableRefObject<Motion>; R: number; ready: boolean }) {
  const { camera, size, pointer } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const portrait = size.width / size.height < 0.9;
  const base = useMemo(() => {
    const aspect = size.width / size.height;
    if (portrait) {
      const hf = 2 * Math.atan(PW / (2 * 0.86 * R));
      return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / aspect));
    }
    const frac = ((size.height - 72) * 0.56) / size.height;
    return THREE.MathUtils.radToDeg(2 * Math.atan(PH / (2 * frac * R)));
  }, [size.width, size.height, portrait, R]);
  useEffect(() => {
    const w = size.width;
    const h = size.height;
    const cx = portrait ? w / 2 : w * 0.63;
    const cy = portrait ? 76 + w * 0.3 : 72 + (h - 72) * 0.44;
    cam.setViewOffset(w, h, -(cx - w / 2), -(cy - h / 2), w, h);
    cam.updateProjectionMatrix();
    return () => cam.clearViewOffset();
  }, [cam, size.width, size.height, portrait]);
  const readyT = useRef<number | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const M = m.current;
    const vel = THREE.MathUtils.clamp(M.v, -8, 8);
    let fov = base + Math.min(12, Math.abs(vel) * 2.2);
    let z = 0;
    if (ready) {
      if (readyT.current == null) readyT.current = t;
      // Travelling compensé : on avance vers l'écran, l'objectif s'ouvre.
      const p = Math.min(1, (t - readyT.current) / 0.95);
      const e = p * p * (3 - 2 * p);
      z = -e * (R - 1.6);
      fov = base + e * 38;
    } else readyT.current = null;
    const k = 1 - Math.exp(-dt * 7);
    cam.fov = THREE.MathUtils.lerp(cam.fov, fov, ready ? 1 : k);
    cam.position.set(Math.sin(t * 0.23) * 0.06, Math.sin(t * 0.31) * 0.05 + 0.1, ready ? z : THREE.MathUtils.lerp(cam.position.z, 0, k));
    look.set(pointer.x * 0.7, pointer.y * 0.35 + 0.05, -R);
    cam.lookAt(look);
    // Inclinaison dans le virage.
    cam.rotateZ(THREE.MathUtils.clamp(-vel * 0.03, -0.14, 0.14) + Math.sin(t * 0.17) * 0.004);
    cam.updateProjectionMatrix();
  });
  return null;
}

function Physics({ m, n, onPick }: { m: React.MutableRefObject<Motion>; n: number; onPick: (k: number) => void }) {
  useFrame((_, dtRaw) => {
    const M = m.current;
    if (M.drag) return;
    // Ressort intégré en petits pas pour rester stable à bas FPS.
    let dt = Math.min(dtRaw, 0.05);
    const h = 1 / 240;
    while (dt > 0) {
      const s = Math.min(h, dt);
      const acc = OMEGA * OMEGA * (M.tgt - M.s) - 2 * DAMPING * OMEGA * M.v;
      M.v += acc * s;
      M.s += M.v * s;
      dt -= s;
    }
    const idx = (((Math.round(M.tgt) % n) + n) % n);
    if (idx !== M.lastPick) {
      M.lastPick = idx;
      onPick(idx);
    }
  });
  return null;
}

export default function OrbitDeck({ items, active, ready, sound, onPick, onGo }: DeckProps) {
  const n = items.length;
  const R = Math.max(5.5, (n * (PW + GAP)) / (Math.PI * 2));
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const warp = useRef(0);
  const m = useRef<Motion>({ s: active, v: 0, tgt: active, drag: null, unit: 600, lastPick: active });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Choix venu d'ailleurs (clavier, défilement auto) : chemin le plus court.
  useEffect(() => {
    const M = m.current;
    if (M.drag) return;
    const curIdx = (((Math.round(M.tgt) % n) + n) % n);
    if (curIdx === active) return;
    M.tgt = Math.round(M.tgt) + wrap(active - curIdx, n);
    M.lastPick = active;
  }, [active, n]);

  // Geste : suivi 1:1, puis élan projeté et accroché à l'écran le plus proche.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const M = m.current;
    const down = (e: PointerEvent) => {
      if (ready || e.button > 0) return;
      M.unit = Math.max(260, el.clientWidth * (el.clientWidth < 860 ? 0.7 : 0.38));
      M.drag = { x: e.clientX, s: M.s, hist: [{ x: e.clientX, t: performance.now() }], moved: false };
      M.v = 0;
    };
    const move = (e: PointerEvent) => {
      const d = M.drag;
      if (!d) return;
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 8) d.moved = true;
      if (!d.moved) return;
      const now = performance.now();
      d.hist.push({ x: e.clientX, t: now });
      while (d.hist.length > 2 && now - d.hist[0].t > 90) d.hist.shift();
      M.s = d.s - dx / M.unit;
      const h0 = d.hist[0];
      const span = Math.max(1, now - h0.t) / 1000;
      M.v = THREE.MathUtils.lerp(M.v, -(e.clientX - h0.x) / M.unit / span, 0.5);
      M.tgt = M.s;
    };
    const up = () => {
      const d = M.drag;
      if (!d) return;
      if (d.moved) {
        // Projection de l'élan (décélération exponentielle), un saut max de 3.
        const proj = M.s + THREE.MathUtils.clamp(M.v * 0.32, -3, 3);
        M.tgt = Math.round(proj);
        // Le clic qui suit le relâché ne doit pas compter.
        setTimeout(() => (M.drag = null), 0);
      } else M.drag = null;
    };
    let acc = 0;
    let accT = 0;
    const wheel = (e: WheelEvent) => {
      if (ready) return;
      // Seul le défilement horizontal (pavé tactile, Maj+molette) fait tourner l'anneau.
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      const now = performance.now();
      if (now - accT > 220) acc = 0;
      accT = now;
      acc += dx;
      if (Math.abs(acc) > 70) {
        M.tgt = Math.round(M.tgt) + Math.sign(acc);
        acc = -Math.sign(acc) * 260; // un cran par geste de pavé
      }
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      el.removeEventListener("wheel", wheel);
    };
  }, [ready]);

  // Plongeon : dédoublement RVB qui monte pendant le travelling.
  useEffect(() => {
    if (!ready) {
      warp.current = 0;
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      warp.current = Math.min(1, (performance.now() - t0) / 950) ** 2;
      if (warp.current < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  return (
    <div
      ref={box}
      className="sel-deck sel-deck--orbit"
      // Le glisser est géré ici : l'écran de sélection ne doit pas le compter aussi.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Canvas frameloop={visible ? "always" : "never"} dpr={[1, 1.75]} camera={{ position: [0, 0, 0], fov: 40, near: 0.1, far: 60 }} gl={{ antialias: true, alpha: true }}>
        <Physics m={m} n={n} onPick={onPick} />
        <Rig m={m} R={R} ready={!!ready} />
        <Streaks m={m} n={n} R={R} color={items[active].accent} />
        {items.map((it, k) => (
          <Panel key={it.slug} item={it} idx={k} n={n} R={R} m={m} active={k === active} sound={sound && k === active} warp={warp} onPick={() => onPick(k)} onGo={() => onGo(it)} />
        ))}
      </Canvas>
    </div>
  );
}
