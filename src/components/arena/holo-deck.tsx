import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { DeckProps, SelectItem } from "./select-screen";

// Les tournois en cartes holographiques à collectionner. Les cartes sont en
// éventail en bas, comme une main ; celle choisie s'envole en grand, flotte et
// suit la souris, son reflet arc-en-ciel change avec l'angle. Validation : la
// carte fait un tour sur elle-même et fonce vers toi.

export const CW = 2.2;
export const CH = (CW * 88) / 63;
const DEPTH = 0.03;
export const TW = 768;
export const TH = Math.round((TW * 88) / 63);

// ── Géométrie : carte épaisse à coins arrondis ───────────────────────
export function cardGeometry() {
  const r = 0.13;
  const w = CW;
  const h = CH;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -DEPTH / 2);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return g;
}

// ── Faces dessinées (canvas 2D) ──────────────────────────────────────
export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
export function cover(g: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, x: number, y: number, w: number, h: number) {
  if (!sw || !sh) return;
  const k = Math.max(w / sw, h / sh);
  const dw = sw * k;
  const dh = sh * k;
  g.drawImage(src, x + (w - dw) * 0.55, y + (h - dh) * 0.4, dw, dh);
}
const ART = { x: 44, y: 44, w: TW - 88, h: Math.round(TH * 0.64) };

function drawFrame(g: CanvasRenderingContext2D, it: SelectItem, idx: number) {
  g.clearRect(0, 0, TW, TH);
  // Cadre : dégradé de la couleur du tournoi, liseré clair.
  const fr = g.createLinearGradient(0, 0, TW, TH);
  fr.addColorStop(0, it.accent);
  fr.addColorStop(0.5, "#1a1b22");
  fr.addColorStop(1, it.accent);
  rr(g, 0, 0, TW, TH, 44);
  g.fillStyle = fr;
  g.fill();
  rr(g, 16, 16, TW - 32, TH - 32, 32);
  g.fillStyle = "#0c0d12";
  g.fill();
  // Bas de carte : nom, type, numéro.
  const by = ART.y + ART.h + 34;
  g.fillStyle = it.accent;
  g.font = '700 26px "Geist Mono", ui-monospace, monospace';
  g.textBaseline = "top";
  g.fillText(`N° ${String(idx + 1).padStart(2, "0")}`, 52, by);
  g.textAlign = "right";
  g.fillStyle = "rgba(244,242,236,0.6)";
  g.font = '600 22px "Inter", system-ui, sans-serif';
  g.fillText(it.kind.toUpperCase(), TW - 52, by + 3);
  g.textAlign = "left";
  // Nom en très gros, ajusté à la largeur.
  const name = it.short.toUpperCase();
  let fs = 118;
  g.font = `800 ${fs}px "Bricolage Grotesque", system-ui, sans-serif`;
  while (g.measureText(name).width > TW - 104 && fs > 50) {
    fs -= 4;
    g.font = `800 ${fs}px "Bricolage Grotesque", system-ui, sans-serif`;
  }
  g.fillStyle = "#f4f2ec";
  g.fillText(name, 50, by + 44);
  // Accroche sur deux lignes au plus.
  g.font = '500 23px "Inter", system-ui, sans-serif';
  g.fillStyle = "rgba(244,242,236,0.66)";
  const words = it.tagline.split(" ");
  let line = "";
  let y = by + 44 + fs * 0.98 + 14;
  let lines = 0;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > TW - 104) {
      g.fillText(line, 52, y);
      y += 32;
      line = w;
      if (++lines >= 2) {
        line = "";
        break;
      }
    } else line = t;
  }
  if (line) g.fillText(line, 52, y);
  // Pied : marque et étoiles de rareté.
  g.font = '700 20px "Geist Mono", ui-monospace, monospace';
  g.fillStyle = "rgba(244,242,236,0.4)";
  g.fillText("BRAMS · TOURNOIS", 52, TH - 66);
  g.textAlign = "right";
  g.fillStyle = it.accent;
  g.fillText("★★★★★", TW - 52, TH - 66);
  g.textAlign = "left";
}
function drawArt(g: CanvasRenderingContext2D, it: SelectItem, src: CanvasImageSource | null, sw: number, sh: number) {
  g.save();
  rr(g, ART.x, ART.y, ART.w, ART.h, 18);
  g.clip();
  g.fillStyle = "#15161c";
  g.fillRect(ART.x, ART.y, ART.w, ART.h);
  if (src) cover(g, src, sw, sh, ART.x, ART.y, ART.w, ART.h);
  // Léger fondu en bas de l'image.
  const fade = g.createLinearGradient(0, ART.y + ART.h * 0.6, 0, ART.y + ART.h);
  fade.addColorStop(0, "rgba(12,13,18,0)");
  fade.addColorStop(1, "rgba(12,13,18,0.55)");
  g.fillStyle = fade;
  g.fillRect(ART.x, ART.y, ART.w, ART.h);
  g.restore();
  rr(g, ART.x, ART.y, ART.w, ART.h, 18);
  g.lineWidth = 3;
  g.strokeStyle = it.accent;
  g.stroke();
}
export function drawBack(g: CanvasRenderingContext2D, it: Pick<SelectItem, "accent">) {
  const bg = g.createLinearGradient(0, 0, TW, TH);
  bg.addColorStop(0, "#14151c");
  bg.addColorStop(1, "#07080b");
  rr(g, 0, 0, TW, TH, 44);
  g.fillStyle = bg;
  g.fill();
  g.save();
  rr(g, 22, 22, TW - 44, TH - 44, 30);
  g.clip();
  g.strokeStyle = it.accent;
  g.globalAlpha = 0.16;
  g.lineWidth = 2;
  for (let k = -TH; k < TW + TH; k += 34) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k - TH, TH);
    g.stroke();
    g.beginPath();
    g.moveTo(k - TH, 0);
    g.lineTo(k, TH);
    g.stroke();
  }
  g.restore();
  g.globalAlpha = 1;
  rr(g, 22, 22, TW - 44, TH - 44, 30);
  g.lineWidth = 4;
  g.strokeStyle = it.accent;
  g.stroke();
  g.fillStyle = "#f4f2ec";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = '800 132px "Bricolage Grotesque", system-ui, sans-serif';
  g.fillText("BRAMS", TW / 2, TH / 2 - 20);
  g.fillStyle = it.accent;
  g.font = '700 28px "Geist Mono", ui-monospace, monospace';
  g.fillText("T O U R N O I S", TW / 2, TH / 2 + 74);
  g.textAlign = "left";
}

// Une image déjà en cache sans en-tête CORS est refusée : second essai hors cache.
export function loadImage(src: string, retry = true): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.decoding = "async";
    im.onload = () => res(im);
    im.onerror = () => (retry ? loadImage(`${src}${src.includes("?") ? "&" : "?"}gl=1`, false).then(res) : res(null));
    im.src = src;
  });
}

// ── Matériau holographique ───────────────────────────────────────────
export const CARD_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;
void main() {
  vUv = uv;
  vObjN = normal;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;
export const CARD_FS = /* glsl */ `
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform float uT;
uniform float uHolo;
uniform float uDim;
varying vec2 vUv;
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  bool front = vObjN.z > 0.0;
  vec2 uv = front ? vUv : vec2(1.0 - vUv.x, vUv.y);
  vec4 base = front ? texture2D(uFront, uv) : texture2D(uBack, uv);
  if (base.a < 0.5) discard;
  vec3 n = normalize(vN);
  // Arc-en-ciel qui glisse avec l'angle de la carte.
  float band = vUv.x * 0.9 + vUv.y * 0.7 + n.x * 1.8 - n.y * 1.3;
  vec3 foil = hue(fract(band * 1.15 + uT * 0.02));
  float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));
  float mask = 0.25 + 0.75 * smoothstep(0.25, 0.85, lum);
  // Paillettes qui scintillent.
  vec2 cell = floor(vUv * vec2(64.0, 90.0));
  float r = rnd(cell);
  vec2 fc = fract(vUv * vec2(64.0, 90.0)) - 0.5;
  float dotm = smoothstep(0.32, 0.0, length(fc));
  float sp = step(0.982, r) * dotm * pow(max(0.0, sin(uT * 2.2 + r * 60.0 + n.x * 9.0)), 10.0);
  // Reflet de vitre qui suit l'inclinaison.
  float d = (vUv.x - 0.5 + n.x * 1.4) * 1.3 + (vUv.y - 0.5 - n.y * 1.4) * 0.8;
  float glare = exp(-d * d * 9.0);
  float k = front ? 1.0 : 0.45;
  vec3 col = base.rgb * uDim + foil * 0.3 * mask * uHolo * k + sp * 0.9 * uHolo + glare * 0.16 * uHolo;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

// ── Une carte ────────────────────────────────────────────────────────
type Pose = { pos: THREE.Vector3; rot: THREE.Euler; scale: number };
type Layout = { hero: Pose; hand: (j: number, m: number, lift: boolean) => Pose };

function Card({
  item,
  idx,
  active,
  handIndex,
  handCount,
  layout,
  ready,
  sound,
  onPick,
  onGo,
}: {
  item: SelectItem;
  idx: number;
  active: boolean;
  handIndex: number;
  handCount: number;
  layout: React.MutableRefObject<Layout>;
  ready: boolean;
  sound: boolean;
  onPick: () => void;
  onGo: () => void;
}) {
  const geo = useMemo(cardGeometry, []);
  const group = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const { canvas, ctx, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TW;
    c.height = TH;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, ctx: c.getContext("2d")!, tex: t };
  }, []);
  const back = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TW;
    c.height = TH;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { c, t };
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CARD_VS,
        fragmentShader: CARD_FS,
        uniforms: { uFront: { value: tex }, uBack: { value: back.t }, uT: { value: 0 }, uHolo: { value: 0.6 }, uDim: { value: 1 } },
      }),
    [tex, back.t],
  );
  const edge = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(item.accent).multiplyScalar(0.55) }), [item.accent]);
  const still = useRef<HTMLImageElement | null>(null);

  // Faces : cadre + image fixe, dos ; redessinées quand les polices sont prêtes.
  useEffect(() => {
    let live = true;
    const paint = () => {
      if (!live) return;
      drawFrame(ctx, item, idx);
      const im = still.current;
      drawArt(ctx, item, im, im?.naturalWidth ?? 0, im?.naturalHeight ?? 0);
      tex.needsUpdate = true;
      drawBack(back.c.getContext("2d")!, item);
      back.t.needsUpdate = true;
    };
    paint();
    loadImage(item.still).then((im) => {
      still.current = im;
      paint();
    });
    document.fonts?.ready.then(paint);
    return () => {
      live = false;
    };
  }, [item, idx, ctx, tex, back]);

  // Carte en main : l'image fixe. Carte en grand : le générique joue dedans.
  const video = useRef<HTMLVideoElement | null>(null);
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
    v.play().catch(() => {});
    video.current = v;
    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
      video.current = null;
      // Retour à l'image fixe.
      drawFrame(ctx, item, idx);
      const im = still.current;
      drawArt(ctx, item, im, im?.naturalWidth ?? 0, im?.naturalHeight ?? 0);
      tex.needsUpdate = true;
    };
  }, [active, item, idx, ctx, tex]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = !sound;
    if (sound) {
      v.volume = 0.7;
      v.play().catch(() => {});
    }
  }, [sound, active]);

  const lastDraw = useRef(0);
  // Distribution à l'arrivée : chaque carte part du paquet, de dos, et se retourne.
  const born = useRef<number | null>(null);
  // Carte qu'on tire : un tour complet en montant.
  const pull = useRef<number | null>(null);
  const pullPending = useRef(false);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) pullPending.current = true;
    wasActive.current = active;
  }, [active]);
  const spin = useRef(0);
  const readyT = useRef<number | null>(null);
  const tq = useMemo(() => new THREE.Quaternion(), []);
  const te = useMemo(() => new THREE.Euler(), []);
  const { pointer } = useThree();

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    mat.uniforms.uT.value = t;
    // Image vivante dans la carte en grand (30 i/s).
    const v = video.current;
    if (active && v && v.readyState >= 2 && t - lastDraw.current > 1 / 30) {
      lastDraw.current = t;
      drawArt(ctx, item, v, v.videoWidth, v.videoHeight);
      tex.needsUpdate = true;
    }
    const L = layout.current;
    const pose = active ? L.hero : L.hand(handIndex, handCount, hover);
    if (born.current == null) born.current = t + 0.2 + (active ? handCount * 0.08 + 0.15 : handIndex * 0.08);
    if (t < born.current) {
      // Encore dans le paquet, sous l'écran, face cachée.
      g.position.set(L.hero.pos.x, L.hero.pos.y - 9, 1);
      g.rotation.set(0, Math.PI, 0.3);
      g.scale.setScalar(pose.scale);
      return;
    }
    const life = t - born.current;
    const flip = Math.PI * Math.pow(1 - THREE.MathUtils.smoothstep(life, 0, 0.8), 2);
    if (pullPending.current) {
      pullPending.current = false;
      pull.current = t;
    }
    let pullSpin = 0;
    if (pull.current != null) {
      const p = Math.min(1, (t - pull.current) / 0.8);
      pullSpin = Math.PI * 2 * (1 - (1 - Math.pow(1 - p, 3)));
      if (p >= 1) pull.current = null;
    }
    const k = 1 - Math.exp(-dt * (active ? 6 : 8));
    g.position.lerp(pose.pos, k);
    let rx = pose.rot.x;
    let ry = pose.rot.y;
    const rz = pose.rot.z;
    let extraZ = 0;
    let s = pose.scale;
    if (active) {
      // Flotte et suit la souris.
      ry += Math.sin(t * 0.6) * 0.18 + pointer.x * 0.45;
      rx += -pointer.y * 0.3 + Math.sin(t * 0.45) * 0.05;
      g.position.y += Math.sin(t * 1.1) * 0.0025;
      if (ready) {
        if (readyT.current == null) readyT.current = t;
        const p = Math.min(1, (t - readyT.current) / 0.85);
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        spin.current = e * Math.PI * 2;
        extraZ = Math.pow(p, 2.4) * 4.5;
        s *= 1 + p * 0.15;
      }
    } else {
      readyT.current = null;
      // Carte survolée dans la main : elle penche vers la souris.
      if (hover) {
        rx += -pointer.y * 0.25;
        ry += pointer.x * 0.35;
      }
    }
    te.set(rx, ry + spin.current * (active ? 1 : 0) + flip + pullSpin, rz);
    tq.setFromEuler(te);
    g.quaternion.slerp(tq, active && ready ? 1 : k);
    g.position.z += (pose.pos.z + extraZ - g.position.z) * (ready && active ? 1 : 0);
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, s, k));
    mat.uniforms.uHolo.value = THREE.MathUtils.lerp(mat.uniforms.uHolo.value, active ? 0.75 : hover ? 0.6 : 0.3, k);
    mat.uniforms.uDim.value = THREE.MathUtils.lerp(mat.uniforms.uDim.value, active || hover ? 1 : 0.62, k);
  });

  return (
    <group ref={group}>
      <mesh
        geometry={geo}
        material={[mat, edge]}
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
          if (active) onGo();
          else onPick();
        }}
      />
    </group>
  );
}

// Halo de la couleur du tournoi derrière la carte en grand.
let haloTex: THREE.Texture | null = null;
export function halo() {
  if (haloTex) return haloTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.4, "rgba(255,255,255,0.35)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
}
function Glow({ layout, color }: { layout: React.MutableRefObject<Layout>; color: string }) {
  const m = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo(() => new THREE.Color(color), [color]);
  useFrame((state, dt) => {
    const h = layout.current.hero;
    if (m.current) {
      m.current.position.set(h.pos.x, h.pos.y, -1.2);
      m.current.scale.setScalar(h.scale * (1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.03));
    }
    if (mat.current) mat.current.color.lerp(target, 1 - Math.exp(-dt * 3));
  });
  return (
    <mesh ref={m} raycast={() => null}>
      <planeGeometry args={[CW * 3.4, CH * 2.2]} />
      <meshBasicMaterial ref={mat} map={halo()} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

// Disposition selon l'écran : carte en grand à droite (paysage) ou en haut
// (portrait), la main en éventail en bas.
function useLayout(ref: React.MutableRefObject<Layout>) {
  const { size, viewport } = useThree();
  useEffect(() => {
    const vw = viewport.width;
    const vh = viewport.height;
    const pxToW = vh / size.height;
    const sx = (px: number) => -vw / 2 + px * pxToW;
    const sy = (py: number) => vh / 2 - py * pxToW;
    const portrait = size.width / size.height < 0.9;
    let heroH: number;
    let hx: number;
    let hy: number;
    let handH: number;
    let cx: number;
    let cy: number;
    if (portrait) {
      heroH = size.width * 0.8;
      hx = sx(size.width / 2);
      hy = sy(76 + size.width * 0.44);
      handH = size.width * 0.3;
      cx = hx;
      cy = sy(76 + size.width * 1.12);
    } else {
      // Le haut de la section passe sous la barre du site (~72 px).
      heroH = (size.height - 72) * 0.6;
      hx = sx(size.width * 0.64);
      hy = sy(72 + (size.height - 72) * 0.42);
      handH = size.height * 0.25;
      cx = sx(size.width * 0.64);
      cy = sy(size.height * 0.96);
    }
    const heroS = (heroH * pxToW) / CH;
    const handS = (handH * pxToW) / CH;
    const R = CH * handS * 7;
    ref.current = {
      hero: { pos: new THREE.Vector3(hx, hy, 0), rot: new THREE.Euler(0, -0.12, 0), scale: heroS },
      hand: (j, m, lift) => {
        const a = (j - (m - 1) / 2) * (portrait ? 0.075 : 0.07);
        const up = lift ? CH * handS * 0.42 : 0;
        return {
          pos: new THREE.Vector3(cx + Math.sin(a) * R + Math.sin(a) * up, cy + Math.cos(a) * R - R + Math.cos(a) * up, 0.4 + j * 0.02 + (lift ? 0.3 : 0)),
          rot: new THREE.Euler(0, 0, -a),
          scale: handS,
        };
      },
    };
  }, [size.width, size.height, viewport.width, viewport.height, ref]);
}

function Scene({ items, active, ready, sound, onPick, onGo }: DeckProps) {
  const layout = useRef<Layout>({
    hero: { pos: new THREE.Vector3(), rot: new THREE.Euler(), scale: 1 },
    hand: () => ({ pos: new THREE.Vector3(0, -6, 0), rot: new THREE.Euler(), scale: 0.5 }),
  });
  useLayout(layout);
  const others = items.map((_, k) => k).filter((k) => k !== active);
  return (
    <>
      <Glow layout={layout} color={items[active].accent} />
      {items.map((it, k) => (
        <Card
          key={it.slug}
          item={it}
          idx={k}
          active={k === active}
          handIndex={Math.max(0, others.indexOf(k))}
          handCount={others.length}
          layout={layout}
          ready={!!ready && k === active}
          sound={sound && k === active}
          onPick={() => onPick(k)}
          onGo={() => onGo(it)}
        />
      ))}
    </>
  );
}

export default function HoloDeck(props: DeckProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className="sel-deck">
      <Canvas frameloop={visible ? "always" : "never"} dpr={[1, 2]} camera={{ position: [0, 0, 9], fov: 32 }} gl={{ antialias: true, alpha: true }}>
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
