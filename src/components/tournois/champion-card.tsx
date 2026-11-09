import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CARD_FS, CARD_VS, CH, TH, TW, cardGeometry, cover, drawBack, halo, loadImage, rr } from "../arena/holo-deck";
import "./champion-card.css";

// Fin de partie : le champion sort comme une carte légendaire. Elle monte face
// cachée en tournant, se retourne dans un éclair doré, puis flotte et suit la
// souris, reflet holo à fond. Même carte que celles du hub (holo-deck).

export type ChampCardData = {
  title: string;
  sub: string;
  art: string;
  label: string;
  tournament: string;
  size: number;
};

const GOLD = "#e8c06a";

function drawFace(g: CanvasRenderingContext2D, d: ChampCardData, im: HTMLImageElement | null) {
  g.clearRect(0, 0, TW, TH);
  const fr = g.createLinearGradient(0, 0, TW, TH);
  fr.addColorStop(0, "#fff4c8");
  fr.addColorStop(0.3, "#d8a748");
  fr.addColorStop(0.55, "#7a5520");
  fr.addColorStop(0.8, "#f2cf7c");
  fr.addColorStop(1, "#8a6224");
  rr(g, 0, 0, TW, TH, 44);
  g.fillStyle = fr;
  g.fill();
  rr(g, 18, 18, TW - 36, TH - 36, 32);
  g.fillStyle = "#0d0b08";
  g.fill();
  // Image du champion.
  const A = { x: 44, y: 96, w: TW - 88, h: Math.round(TH * 0.6) };
  g.save();
  rr(g, A.x, A.y, A.w, A.h, 16);
  g.clip();
  g.fillStyle = "#1a160f";
  g.fillRect(A.x, A.y, A.w, A.h);
  if (im) cover(g, im, im.naturalWidth, im.naturalHeight, A.x, A.y, A.w, A.h);
  const fade = g.createLinearGradient(0, A.y + A.h * 0.55, 0, A.y + A.h);
  fade.addColorStop(0, "rgba(13,11,8,0)");
  fade.addColorStop(1, "rgba(13,11,8,0.6)");
  g.fillStyle = fade;
  g.fillRect(A.x, A.y, A.w, A.h);
  g.restore();
  rr(g, A.x, A.y, A.w, A.h, 16);
  g.lineWidth = 4;
  g.strokeStyle = GOLD;
  g.stroke();
  // Bandeau du haut.
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillStyle = GOLD;
  g.font = '800 38px "Bricolage Grotesque", system-ui, sans-serif';
  g.fillText(d.label.toUpperCase(), TW / 2, 58);
  g.textAlign = "left";
  g.textBaseline = "top";
  // Titre (deux lignes au plus), puis l'œuvre.
  const maxW = TW - 104;
  let fs = 84;
  const lines = (size: number) => {
    g.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
    const out: string[] = [];
    let line = "";
    for (const w of d.title.split(" ")) {
      const t = line ? `${line} ${w}` : w;
      if (g.measureText(t).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    if (line) out.push(line);
    return out;
  };
  let L = lines(fs);
  while ((L.length > 2 || L.some((l) => g.measureText(l).width > maxW)) && fs > 40) {
    fs -= 4;
    L = lines(fs);
  }
  let y = A.y + A.h + 30;
  g.fillStyle = "#fbf3e0";
  for (const l of L.slice(0, 2)) {
    g.fillText(l, 52, y);
    y += fs * 0.98;
  }
  g.font = '600 26px "Inter", system-ui, sans-serif';
  g.fillStyle = "rgba(251,243,224,0.7)";
  g.fillText(d.sub, 52, y + 8);
  // Pied.
  g.font = '700 21px "Geist Mono", ui-monospace, monospace';
  g.fillStyle = "rgba(232,192,106,0.75)";
  g.fillText(`${d.tournament.toUpperCase()} · ${d.size}`, 52, TH - 70);
  g.textAlign = "right";
  g.fillStyle = GOLD;
  g.fillText("★★★★★ LÉGENDAIRE", TW - 52, TH - 70);
  g.textAlign = "left";
}

function Card({ data }: { data: ChampCardData }) {
  const geo = useMemo(cardGeometry, []);
  const g = useRef<THREE.Group>(null);
  const { front, back, mat, edge } = useMemo(() => {
    const mk = () => {
      const c = document.createElement("canvas");
      c.width = TW;
      c.height = TH;
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return { c, t };
    };
    const f = mk();
    const b = mk();
    const m = new THREE.ShaderMaterial({
      vertexShader: CARD_VS,
      fragmentShader: CARD_FS,
      uniforms: { uFront: { value: f.t }, uBack: { value: b.t }, uT: { value: 0 }, uHolo: { value: 1 }, uDim: { value: 1 } },
    });
    return { front: f, back: b, mat: m, edge: new THREE.MeshBasicMaterial({ color: "#b8873a" }) };
  }, []);
  useEffect(() => {
    let live = true;
    let im: HTMLImageElement | null = null;
    const paint = () => {
      if (!live) return;
      drawFace(front.c.getContext("2d")!, data, im);
      front.t.needsUpdate = true;
      drawBack(back.c.getContext("2d")!, { accent: GOLD });
      back.t.needsUpdate = true;
    };
    paint();
    loadImage(data.art).then((x) => {
      im = x;
      paint();
    });
    document.fonts?.ready.then(paint);
    return () => {
      live = false;
    };
  }, [data, front, back]);

  const { pointer, viewport } = useThree();
  const t0 = useRef<number | null>(null);
  const tq = useMemo(() => new THREE.Quaternion(), []);
  const te = useMemo(() => new THREE.Euler(), []);
  useFrame((state, dt) => {
    const grp = g.current;
    if (!grp) return;
    const t = state.clock.elapsedTime;
    if (t0.current == null) t0.current = t;
    const a = t - t0.current;
    mat.uniforms.uT.value = t;
    // Taille : la carte tient dans ~68 % de la hauteur visible.
    const base = Math.min((viewport.height * 0.68) / CH, (viewport.width * 0.8) / (CH * (63 / 88)));
    // 0 → 1,1 s : monte du bas en tournant, face cachée ; 1,1 → 1,7 s : se retourne.
    const rise = THREE.MathUtils.smoothstep(a, 0, 1.1);
    const flip = THREE.MathUtils.smoothstep(a, 1.0, 1.7);
    const y = THREE.MathUtils.lerp(-viewport.height * 0.9, 0.15, 1 - Math.pow(1 - rise, 3));
    const spin = (1 - rise) * Math.PI * 6;
    const ry = Math.PI * (1 - flip) + spin + (a > 1.7 ? Math.sin(t * 0.7) * 0.16 + pointer.x * 0.45 : 0);
    const rx = a > 1.7 ? -pointer.y * 0.3 + Math.sin(t * 0.5) * 0.05 : 0;
    // Petit coup de zoom au moment où elle se retourne.
    const punch = 1 + Math.sin(Math.PI * THREE.MathUtils.clamp((a - 1.3) / 0.5, 0, 1)) * 0.08;
    grp.position.set(0, y + (a > 1.7 ? Math.sin(t * 1.1) * 0.03 : 0), 0);
    grp.scale.setScalar(base * punch);
    te.set(rx, ry, 0);
    tq.setFromEuler(te);
    grp.quaternion.slerp(tq, a < 1.8 ? 1 : 1 - Math.exp(-dt * 8));
  });
  return (
    <group ref={g}>
      <mesh geometry={geo} material={[mat, edge]} />
    </group>
  );
}

function Glow() {
  const m = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    if (m.current) m.current.opacity = THREE.MathUtils.smoothstep(s.clock.elapsedTime, 1.1, 1.8) * (0.55 + Math.sin(s.clock.elapsedTime * 1.4) * 0.06);
  });
  return (
    <mesh position={[0, 0.15, -1.5]}>
      <planeGeometry args={[9, 9]} />
      <meshBasicMaterial ref={m} map={halo()} color={GOLD} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export default function ChampionCardReveal({ data, onClose }: { data: ChampCardData; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="cc" role="dialog" aria-modal="true" aria-label={`Carte du champion : ${data.title}`}>
      <div className="cc-rays" aria-hidden />
      <div className="cc-flash" aria-hidden />
      <Canvas className="cc-canvas" dpr={[1, 2]} camera={{ position: [0, 0, 9], fov: 32 }} gl={{ antialias: true, alpha: true }}>
        <Glow />
        <Card data={data} />
      </Canvas>
      <div className="cc-ui">
        <p className="cc-kicker">Nouvelle carte légendaire</p>
        <button type="button" className="cc-go" onClick={onClose} autoFocus>
          Continuer
        </button>
      </div>
    </div>
  );
}
