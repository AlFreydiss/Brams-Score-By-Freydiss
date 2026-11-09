import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { DeckProps, SelectItem } from "./select-screen";
import { cover, halo, loadImage } from "./holo-deck";

// Les tournois en écrans géants disposés en anneau autour de toi, dans une
// salle : le générique de l'écran choisi baigne tout le fond en grand et flou,
// un sol noir laqué reflète les écrans et tourne avec eux, des faisceaux
// tombent derrière l'écran, de la poussière flotte dans la lumière.
// On fait défiler 1:1 au doigt ou à la souris, avec l'élan du geste : la
// caméra penche dans les virages, l'objectif s'ouvre avec la vitesse, les
// écrans ondulent et l'image se dédouble en RVB. Validation : la caméra
// fonce dans l'écran pendant que l'objectif s'ouvre.

const PW = 4.6;
const PH = (PW * 9) / 16;
const TW = 1024;
const TH = 576;
const GAP = 0.55;
const FLOOR = -1.62;

// ── Ressort (amortissement / réponse, façon Apple) ───────────────────
const RESPONSE = 0.42;
const DAMPING = 0.86;
const OMEGA = (2 * Math.PI) / RESPONSE;

const wrap = (d: number, n: number) => ((((d + n / 2) % n) + n) % n) - n / 2;
const mod = (k: number, n: number) => ((k % n) + n) % n;

type Motion = {
  s: number; // position du défilé, en écrans
  v: number; // vitesse, écrans / s
  tgt: number;
  drag: { x: number; s: number; hist: { x: number; t: number }[]; moved: boolean } | null;
  unit: number; // pixels pour un écran
  lastPick: number;
};
// Le générique qui joue (un seul à la fois), partagé par l'écran et le fond.
type Live = { k: number; v: HTMLVideoElement; tex: THREE.VideoTexture } | null;
type Shared = { m: React.MutableRefObject<Motion>; live: React.MutableRefObject<Live>; stills: React.MutableRefObject<THREE.Texture[]>; n: number; R: number };

const liveReady = (L: Live, k: number) => !!L && L.k === k && L.v.readyState >= 2 && !L.v.paused;

// ── Écran ────────────────────────────────────────────────────────────
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
uniform float uPhase;
uniform float uRefl;
uniform float uWarp;
uniform vec3 uAcc;
varying vec2 vUv;
float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 pick(vec2 uv) {
  // Image fixe animée : lent zoom et glissé, façon travelling sur une affiche.
  float z = 0.9 + 0.06 * sin(uT * 0.11 + uPhase);
  vec2 drift = vec2(sin(uT * 0.07 + uPhase * 2.0), cos(uT * 0.05 + uPhase)) * 0.035;
  vec2 kb = 0.5 + (uv - 0.5) * z + drift;
  return mix(texture2D(uTex, kb).rgb, texture2D(uVid, uv).rgb, uMix);
}
void main() {
  vec2 uv = vUv;
  // Dédoublement RVB proportionnel à la vitesse (et au plongeon).
  float ca = clamp(uVel, -6.0, 6.0) * 0.0026 + uWarp * 0.012 * (uv.x - 0.5);
  vec3 col;
  col.r = pick(uv + vec2(ca, 0.0)).r;
  col.g = pick(uv).g;
  col.b = pick(uv - vec2(ca, 0.0)).b;
  float lit = mix(0.16, 1.0, max(uFocus, uHover * 0.5));
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
    a = smoothstep(0.5, 0.0, uv.y) * 0.32 * lit;
    col *= 0.85;
  }
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;

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
  g.font = '700 22px "Geist Mono", ui-monospace, monospace';
  g.fillStyle = it.accent;
  g.fillText(String(idx + 1).padStart(2, "0"), 36, TH - 38);
  g.fillStyle = "rgba(244,242,236,0.9)";
  g.fillText(it.short.toUpperCase(), 86, TH - 38);
}

function Panel({ item, idx, sh, active, warp, onPick, onGo }: { item: SelectItem; idx: number; sh: Shared; active: boolean; warp: React.MutableRefObject<number>; onPick: () => void; onGo: () => void }) {
  const { m, live, stills, n, R } = sh;
  const geo = useMemo(() => new THREE.PlaneGeometry(PW, PH, 40, 12), []);
  const { ctx, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TW;
    c.height = TH;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    return { ctx: c.getContext("2d")!, tex: t };
  }, []);
  stills.current[idx] = tex;
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
          uPhase: { value: idx * 1.7 },
          uRefl: { value: refl },
          uWarp: { value: 0 },
          uCurve: { value: 0.035 },
          uAcc: { value: new THREE.Color(item.accent) },
        },
      });
    return [mk(0), mk(1)];
  }, [tex, item.accent, idx]);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let alive = true;
    let im: HTMLImageElement | null = null;
    const draw = () => {
      if (!alive) return;
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
      alive = false;
    };
  }, [item, idx, ctx, tex]);

  const g = useRef<THREE.Group>(null);
  const refl = useRef<THREE.Mesh>(null);
  const step = (Math.PI * 2) / n;
  useFrame((state, dt) => {
    const grp = g.current;
    if (!grp) return;
    const M = m.current;
    const d = wrap(idx - M.s, n);
    const a = d * step;
    const focus = 1 - THREE.MathUtils.smoothstep(Math.abs(d), 0, 1);
    // Sur l'anneau, tourné vers le centre ; petite houle verticale.
    grp.position.set(Math.sin(a) * R, Math.sin(d * 1.3) * 0.16 - (1 - focus) * 0.1 + Math.sin(state.clock.elapsedTime * 0.6 + idx) * 0.03, -Math.cos(a) * R);
    grp.rotation.set(0, -a, d * 0.02);
    grp.scale.setScalar(1 + focus * 0.05);
    grp.visible = Math.abs(a) < Math.PI * 0.62;
    // Reflet symétrique par rapport au sol.
    if (refl.current) refl.current.position.y = (2 * (FLOOR - grp.position.y)) / grp.scale.y;
    const L = live.current;
    const playing = active && liveReady(L, idx);
    const k = 1 - Math.exp(-dt * 6);
    for (const mt of mats) {
      const u = mt.uniforms;
      if (playing && L) u.uVid.value = L.tex;
      u.uT.value = state.clock.elapsedTime;
      u.uVel.value = THREE.MathUtils.clamp(M.v, -6, 6);
      u.uFocus.value = focus;
      u.uHover.value = THREE.MathUtils.lerp(u.uHover.value, hover ? 1 : 0, k);
      u.uMix.value = THREE.MathUtils.lerp(u.uMix.value, playing ? 1 : 0, 1 - Math.exp(-dt * 3));
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
      <mesh ref={refl} geometry={geo} material={mats[1]} scale={[1, -1, 1]} raycast={() => null} />
    </group>
  );
}

// ── Fond : le générique en grand, flou, sur une voûte derrière l'anneau ──
const DOME_FS = /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform float uT;
uniform vec3 uAcc;
varying vec2 vUv;
vec3 blur(sampler2D t, vec2 uv) {
  vec3 c = vec3(0.0);
  for (int i = -2; i <= 2; i++)
    for (int j = -2; j <= 2; j++) c += texture2D(t, uv + vec2(float(i), float(j)) * vec2(0.016, 0.026)).rgb;
  return c / 25.0;
}
void main() {
  vec2 uv = vec2(1.0 - vUv.x, vUv.y);
  // Léger zoom qui respire.
  uv = 0.5 + (uv - 0.5) * (0.86 + 0.03 * sin(uT * 0.13));
  vec3 c = mix(blur(uB, uv), blur(uA, uv), uMix);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  // Assombri et bridé : une image blanche ne doit pas éclairer toute la salle.
  c = mix(vec3(l), c, 1.15);
  c = c / (1.0 + c * 1.6) * 0.5 + uAcc * 0.03;
  // Fondu sur les bords : la voûte se perd dans le noir.
  float a = smoothstep(0.0, 0.32, vUv.y) * smoothstep(1.0, 0.62, vUv.y) * smoothstep(0.0, 0.26, vUv.x) * smoothstep(1.0, 0.74, vUv.x);
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}
`;
const PLAIN_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
function Dome({ sh, active, color }: { sh: Shared; active: number; color: string }) {
  const { m, live, stills, n, R } = sh;
  const RD = R * 2.6;
  const ARC = 2.1;
  const geo = useMemo(() => new THREE.CylinderGeometry(RD, RD, (RD * ARC * 9) / 16, 64, 1, true, Math.PI - ARC / 2, ARC), [RD]);
  const blank = useMemo(() => new THREE.DataTexture(new Uint8Array([10, 10, 14, 255]), 1, 1), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PLAIN_VS,
        fragmentShader: DOME_FS,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        uniforms: { uA: { value: blank }, uB: { value: blank }, uMix: { value: 1 }, uT: { value: 0 }, uAcc: { value: new THREE.Color(color) } },
      }),
    [blank],
  );
  blank.needsUpdate = true;
  const mesh = useRef<THREE.Mesh>(null);
  const tc = useMemo(() => new THREE.Color(color), [color]);
  useFrame((state, dt) => {
    const u = mat.uniforms;
    u.uT.value = state.clock.elapsedTime;
    const L = live.current;
    const want = liveReady(L, active) && L ? L.tex : stills.current[active] ?? blank;
    if (want !== u.uA.value) {
      u.uB.value = u.uA.value;
      u.uA.value = want;
      u.uMix.value = 0;
    }
    u.uMix.value = Math.min(1, u.uMix.value + dt / 0.9);
    u.uAcc.value.lerp(tc, 1 - Math.exp(-dt * 2));
    // La voûte suit l'anneau de loin : parallaxe.
    if (mesh.current) mesh.current.rotation.y = -wrap(m.current.s - active, n) * ((Math.PI * 2) / n) * 0.18;
  });
  return <mesh ref={mesh} geometry={geo} material={mat} position={[0, 1.1, 0]} raycast={() => null} renderOrder={-2} />;
}

// ── Sol laqué : grille polaire qui tourne avec l'anneau, flaque de lumière ──
const FLOOR_FS = /* glsl */ `
uniform float uS;
uniform float uStep;
uniform float uR;
uniform float uT;
uniform vec3 uAcc;
varying vec3 vW;
void main() {
  vec2 p = vW.xz;
  float r = length(p);
  float ang = atan(p.x, -p.y);
  // Rayons : un tous les quarts d'écran, accrochés à l'anneau.
  float g = ang / uStep * 4.0 + uS * 4.0;
  float fg = fwidth(g);
  float radial = smoothstep(1.0 - fg * 2.5, 1.0, abs(fract(g) - 0.5) * 2.0);
  // Cercles, qui avancent doucement vers toi.
  float c = r * 1.2 + uT * 0.12;
  float fc = fwidth(c);
  float ring = smoothstep(1.0 - fc * 2.5, 1.0, abs(fract(c) - 0.5) * 2.0);
  float fade = smoothstep(0.25 * uR, 0.7 * uR, r) * smoothstep(2.3 * uR, 1.1 * uR, r);
  float line = max(radial * 0.45, ring * 0.8) * fade;
  // Flaque de lumière sous l'écran choisi.
  vec2 q = p - vec2(0.0, -uR * 0.92);
  float glow = exp(-dot(q, q * vec2(0.09, 0.55)));
  vec3 col = uAcc * (line * 0.3 + glow * 0.22) + vec3(line * 0.03);
  float a = 0.72 * smoothstep(2.4 * uR, 1.2 * uR, r) + line * 0.2 + glow * 0.1;
  gl_FragColor = vec4(col / max(a, 0.001), clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}
`;
function Floor({ sh, color }: { sh: Shared; color: string }) {
  const { m, n, R } = sh;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PLAIN_VS,
        fragmentShader: FLOOR_FS,
        transparent: true,
        depthWrite: false,
        uniforms: { uS: { value: 0 }, uStep: { value: (Math.PI * 2) / n }, uR: { value: R }, uT: { value: 0 }, uAcc: { value: new THREE.Color(color) } },
      }),
    [n, R],
  );
  const tc = useMemo(() => new THREE.Color(color), [color]);
  useFrame((state, dt) => {
    const u = mat.uniforms;
    u.uS.value = m.current.s;
    u.uT.value = state.clock.elapsedTime;
    u.uAcc.value.lerp(tc, 1 - Math.exp(-dt * 3));
  });
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, 0]} raycast={() => null} renderOrder={-1}>
      <circleGeometry args={[R * 2.5, 96]} />
    </mesh>
  );
}

// ── Faisceaux qui tombent derrière l'écran choisi ────────────────────
const BEAM_FS = /* glsl */ `
uniform vec3 uAcc;
uniform float uT;
uniform float uSeed;
uniform float uOp;
varying vec2 vUv;
void main() {
  float x = abs(vUv.x - 0.5) * 2.0;
  float core = pow(1.0 - x, 3.0);
  float fall = pow(vUv.y, 1.6);
  float flick = 0.8 + 0.2 * sin(uT * (1.3 + uSeed) + uSeed * 9.0);
  float a = core * fall * flick * uOp;
  gl_FragColor = vec4(mix(uAcc, vec3(1.0), 0.25) * a, a);
}
`;
function Beams({ sh, color, ready }: { sh: Shared; color: string; ready: boolean }) {
  const { m, R } = sh;
  const BEAMS = [-2.9, -1.7, -0.6, 0.6, 1.7, 2.9];
  const mats = useMemo(
    () =>
      BEAMS.map(
        (_, i) =>
          new THREE.ShaderMaterial({
            vertexShader: PLAIN_VS,
            fragmentShader: BEAM_FS,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: { uAcc: { value: new THREE.Color(color) }, uT: { value: 0 }, uSeed: { value: i * 0.37 }, uOp: { value: 0.3 } },
          }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const grp = useRef<THREE.Group>(null);
  const tc = useMemo(() => new THREE.Color(color), [color]);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const sp = Math.abs(m.current.v);
    mats.forEach((mt, i) => {
      mt.uniforms.uT.value = t;
      mt.uniforms.uAcc.value.lerp(tc, 1 - Math.exp(-dt * 3));
      // Les faisceaux s'éteignent pendant le défilé et se rallument à l'arrêt.
      const target = ready ? 0.9 : Math.max(0.04, 0.32 - sp * 0.12);
      mt.uniforms.uOp.value = THREE.MathUtils.lerp(mt.uniforms.uOp.value, target, 1 - Math.exp(-dt * (ready ? 8 : 4)));
      void i;
    });
    grp.current?.children.forEach((c, i) => {
      c.rotation.z = BEAMS[i] * -0.09 + Math.sin(t * 0.3 + i) * 0.04;
    });
  });
  return (
    <group ref={grp} position={[0, 0, -R - 1.4]}>
      {BEAMS.map((x, i) => (
        <mesh key={i} material={mats[i]} position={[x, 2.6, 0]} raycast={() => null}>
          <planeGeometry args={[0.9 + (i % 2) * 0.5, 9]} />
        </mesh>
      ))}
    </group>
  );
}

// ── Poussière dans la lumière ────────────────────────────────────────
function Dust({ sh, color }: { sh: Shared; color: string }) {
  const { m, n, R } = sh;
  const COUNT = 520;
  const seed = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        a: Math.random() * Math.PI * 2,
        r: R * (0.35 + Math.random() * 1.1),
        y: FLOOR + Math.random() * 6,
        sp: 0.04 + Math.random() * 0.12,
        ph: Math.random() * 10,
      })),
    [R],
  );
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    return g;
  }, []);
  const mat = useRef<THREE.PointsMaterial>(null);
  const tc = useMemo(() => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.4), [color]);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const step = (Math.PI * 2) / n;
    const p = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const s = seed[i];
      s.y += s.sp * dt;
      if (s.y > FLOOR + 6) s.y = FLOOR;
      const a = s.a - m.current.s * step * (s.r / R) * 0.9 + Math.sin(t * 0.2 + s.ph) * 0.01;
      p[i * 3] = Math.sin(a) * s.r + Math.sin(t * 0.5 + s.ph) * 0.05;
      p[i * 3 + 1] = s.y;
      p[i * 3 + 2] = -Math.cos(a) * s.r;
    }
    geo.attributes.position.needsUpdate = true;
    mat.current?.color.lerp(tc, 1 - Math.exp(-dt * 3));
  });
  return (
    <points geometry={geo} frustumCulled={false} raycast={() => null}>
      <pointsMaterial ref={mat} map={halo()} size={0.07} sizeAttenuation transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// Traînées de lumière : quasi invisibles au repos, elles s'étirent avec la vitesse.
function Streaks({ sh, color }: { sh: Shared; color: string }) {
  const { m, n, R } = sh;
  const COUNT = 200;
  const seed = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        a: Math.random() * Math.PI * 2,
        r: R * (0.45 + Math.random() * 0.9),
        y: FLOOR + 0.2 + Math.random() * 5.5,
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
      const par = s.r / R;
      const a0 = s.a - M.s * step * par;
      const a1 = a0 + vel * step * 0.09 * par + 0.003;
      p.set([Math.sin(a0) * s.r, s.y, -Math.cos(a0) * s.r, Math.sin(a1) * s.r, s.y, -Math.cos(a1) * s.r], i * 6);
    }
    geo.attributes.position.needsUpdate = true;
    if (mat.current) {
      mat.current.opacity = THREE.MathUtils.lerp(mat.current.opacity, Math.min(0.6, Math.abs(vel) * 0.14), 1 - Math.exp(-dt * 8));
      mat.current.color.lerp(tc, 1 - Math.exp(-dt * 3));
    }
  });
  return (
    <lineSegments geometry={geo} raycast={() => null} frustumCulled={false}>
      <lineBasicMaterial ref={mat} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

// Caméra au centre de l'anneau. Le centre optique est décalé (à droite en
// paysage, en haut en portrait) pour laisser la place au texte.
function Rig({ sh, ready }: { sh: Shared; ready: boolean }) {
  const { m, R } = sh;
  const { camera, size, pointer } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const portrait = size.width / size.height < 0.9;
  const base = useMemo(() => {
    const aspect = size.width / size.height;
    if (portrait) {
      const hf = 2 * Math.atan(PW / (2 * 0.86 * R));
      return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / aspect));
    }
    const frac = ((size.height - 72) * 0.52) / size.height;
    return THREE.MathUtils.radToDeg(2 * Math.atan(PH / (2 * frac * R)));
  }, [size.width, size.height, portrait, R]);
  useEffect(() => {
    const w = size.width;
    const h = size.height;
    const cx = portrait ? w / 2 : w * 0.63;
    const cy = portrait ? 76 + w * 0.3 : 72 + (h - 72) * 0.42;
    cam.setViewOffset(w, h, -(cx - w / 2), -(cy - h / 2), w, h);
    cam.updateProjectionMatrix();
    return () => cam.clearViewOffset();
  }, [cam, size.width, size.height, portrait]);
  const readyT = useRef<number | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  const roll = useRef(0);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const vel = THREE.MathUtils.clamp(m.current.v, -8, 8);
    let fov = base + Math.min(12, Math.abs(vel) * 2.2);
    let z = 0;
    if (ready) {
      if (readyT.current == null) readyT.current = t;
      // On fonce dans l'écran, l'objectif s'ouvre.
      const p = Math.min(1, (t - readyT.current) / 0.95);
      const e = p * p * (3 - 2 * p);
      z = -e * (R - 1.6);
      fov = base + e * 38;
    } else readyT.current = null;
    const k = 1 - Math.exp(-dt * 7);
    cam.fov = THREE.MathUtils.lerp(cam.fov, fov, ready ? 1 : k);
    cam.position.set(Math.sin(t * 0.23) * 0.06, Math.sin(t * 0.31) * 0.05 + 0.1, ready ? z : THREE.MathUtils.lerp(cam.position.z, 0, k));
    look.set(pointer.x * 0.7, pointer.y * 0.35 + 0.02, -R);
    cam.lookAt(look);
    // Inclinaison dans le virage, lissée.
    roll.current = THREE.MathUtils.lerp(roll.current, THREE.MathUtils.clamp(-vel * 0.03, -0.14, 0.14), 1 - Math.exp(-dt * 10));
    cam.rotateZ(roll.current + Math.sin(t * 0.17) * 0.004);
    cam.updateProjectionMatrix();
  });
  return null;
}

function Physics({ sh, onPick }: { sh: Shared; onPick: React.MutableRefObject<(k: number) => void> }) {
  const { m, n } = sh;
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
    const idx = mod(Math.round(M.tgt), n);
    if (idx !== M.lastPick) {
      M.lastPick = idx;
      onPick.current(idx);
    }
  });
  return null;
}

// Cadran : les tournois en crans sur un disque qui tourne avec l'anneau.
function Dial({ m, items, active, onPick }: { m: React.MutableRefObject<Motion>; items: SelectItem[]; active: number; onPick: (k: number) => void }) {
  const n = items.length;
  const disc = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      disc.current?.setAttribute("transform", `rotate(${(-m.current.s * 360) / n} 60 60)`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [m, n]);
  return (
    <div className="orb-dial" style={{ "--acc": items[active].accent } as React.CSSProperties}>
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="44" className="orb-dial-track" />
        <g ref={disc}>
          {items.map((it, k) => {
            const a = (k / n) * Math.PI * 2;
            const x = 60 + Math.sin(a) * 44;
            const y = 60 - Math.cos(a) * 44;
            return (
              <circle
                key={it.slug}
                cx={x}
                cy={y}
                r={k === active ? 5 : 3}
                className={k === active ? "is-on" : ""}
                style={{ fill: it.accent }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPick(k);
                }}
              />
            );
          })}
        </g>
        <path d="M60 4 l4 7 h-8 z" className="orb-dial-mark" />
      </svg>
      <p>
        <b>{String(active + 1).padStart(2, "0")}</b>
        <span>/ {String(n).padStart(2, "0")}</span>
      </p>
    </div>
  );
}

export default function OrbitDeck({ items, active, ready, sound, onPick, onGo }: DeckProps) {
  const n = items.length;
  const R = Math.max(5.5, (n * (PW + GAP)) / (Math.PI * 2));
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const warp = useRef(0);
  const m = useRef<Motion>({ s: active, v: 0, tgt: active, drag: null, unit: 600, lastPick: active });
  const live = useRef<Live>(null);
  const stills = useRef<THREE.Texture[]>([]);
  const sh: Shared = useMemo(() => ({ m, live, stills, n, R }), [n, R]);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const acc = items[active].accent;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Choix venu d'ailleurs (clavier, cadran, défilement auto) : chemin le plus court.
  useEffect(() => {
    const M = m.current;
    if (M.drag) return;
    const curIdx = mod(Math.round(M.tgt), n);
    if (curIdx === active) return;
    M.tgt = Math.round(M.tgt) + wrap(active - curIdx, n);
    M.lastPick = active;
  }, [active, n]);

  // Le générique de l'écran choisi, partagé avec le fond. Petit délai : pas de
  // vidéo lancée pour chaque écran survolé pendant un défilé rapide.
  const it = items[active];
  useEffect(() => {
    if (it.media.k !== "video") return;
    const media = it.media;
    let v: HTMLVideoElement | null = null;
    let tex: THREE.VideoTexture | null = null;
    const t = setTimeout(() => {
      v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = !soundRef.current;
      v.volume = 0.7;
      v.loop = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = `${media.src}#t=${media.start}`;
      const vv = v;
      vv.addEventListener("loadedmetadata", () => {
        if (vv.currentTime < media.start - 1) vv.currentTime = media.start;
      });
      tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      v.play().catch(() => {
        // Lecture avec son refusée par le navigateur : on relance en muet.
        if (vv.muted) return;
        vv.muted = true;
        vv.play().catch(() => {});
      });
      live.current = { k: active, v, tex };
    }, 260);
    return () => {
      clearTimeout(t);
      if (live.current?.v === v) live.current = null;
      if (v) {
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
      // Laisse le fond finir son fondu avant de libérer la texture.
      const old = tex;
      setTimeout(() => old?.dispose(), 1200);
    };
  }, [it, active]);
  useEffect(() => {
    const L = live.current;
    if (!L) return;
    L.v.muted = !sound;
    if (sound) {
      L.v.volume = 0.7;
      L.v.play().catch(() => {});
    }
  });

  // Geste : suivi 1:1 (le texte suit en direct), puis élan projeté et accroché.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const M = m.current;
    const down = (e: PointerEvent) => {
      if (ready || e.button > 0) return;
      if ((e.target as HTMLElement).closest(".orb-dial")) return;
      M.unit = Math.max(260, el.clientWidth * (el.clientWidth < 860 ? 0.7 : 0.38));
      // On rattrape l'anneau en plein vol, depuis sa position affichée.
      M.drag = { x: e.clientX, s: M.s, hist: [{ x: e.clientX, t: performance.now() }], moved: false };
    };
    const move = (e: PointerEvent) => {
      const d = M.drag;
      if (!d) return;
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 8) {
        d.moved = true;
        d.x = e.clientX; // pas de saut au démarrage
      }
      if (!d.moved) return;
      const now = performance.now();
      d.hist.push({ x: e.clientX, t: now });
      while (d.hist.length > 2 && now - d.hist[0].t > 90) d.hist.shift();
      M.s = d.s - (e.clientX - d.x) / M.unit;
      const h0 = d.hist[0];
      const span = Math.max(1, now - h0.t) / 1000;
      M.v = THREE.MathUtils.lerp(M.v, -(e.clientX - h0.x) / M.unit / span, 0.5);
      M.tgt = M.s;
      // Cran franchi : le texte change, petit tic sur mobile.
      const idx = mod(Math.round(M.s), n);
      if (idx !== M.lastPick) {
        M.lastPick = idx;
        pickRef.current(idx);
        navigator.vibrate?.(6);
      }
    };
    const up = () => {
      const d = M.drag;
      if (!d) return;
      if (d.moved) {
        // Il faut avoir bougé récemment pour lancer : une main posée puis lâchée ne glisse pas.
        const fresh = performance.now() - d.hist[d.hist.length - 1].t < 80;
        if (!fresh) M.v = 0;
        // Projection de l'élan (décélération exponentielle), trois écrans au plus.
        const proj = M.s + THREE.MathUtils.clamp(M.v * 0.32, -3, 3);
        let target = Math.round(proj);
        // Un petit geste franc suffit à passer au voisin.
        if (target === Math.round(d.s) && Math.abs(M.v) > 0.8) target += Math.sign(M.v);
        M.tgt = target;
        setTimeout(() => (M.drag = null), 0);
      } else M.drag = null;
    };
    let wacc = 0;
    let waccT = 0;
    const wheel = (e: WheelEvent) => {
      if (ready) return;
      // Seul le défilement horizontal (pavé tactile, Maj+molette) fait tourner l'anneau.
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      const now = performance.now();
      if (now - waccT > 220) wacc = 0;
      waccT = now;
      wacc += dx;
      if (Math.abs(wacc) > 70) {
        M.tgt = Math.round(M.tgt) + Math.sign(wacc);
        wacc = -Math.sign(wacc) * 260; // un cran par geste de pavé
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
  }, [ready, n]);

  // Plongeon : dédoublement RVB qui monte pendant la poussée.
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
      <Canvas frameloop={visible ? "always" : "never"} dpr={[1, 1.75]} camera={{ position: [0, 0, 0], fov: 40, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: true }}>
        <Physics sh={sh} onPick={pickRef} />
        <Rig sh={sh} ready={!!ready} />
        <Dome sh={sh} active={active} color={acc} />
        <Floor sh={sh} color={acc} />
        <Beams sh={sh} color={acc} ready={!!ready} />
        <Dust sh={sh} color={acc} />
        <Streaks sh={sh} color={acc} />
        {items.map((x, k) => (
          <Panel key={x.slug} item={x} idx={k} sh={sh} active={k === active} warp={warp} onPick={() => onPick(k)} onGo={() => onGo(x)} />
        ))}
      </Canvas>
      <div className="orb-grain" aria-hidden />
      <Dial m={m} items={items} active={active} onPick={onPick} />
    </div>
  );
}
