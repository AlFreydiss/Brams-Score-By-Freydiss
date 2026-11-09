import { useEffect, useRef } from "react";

// Fond vivant du hub, sous les rangées de tournois : une brume volumétrique
// (filaments de bruit, pas des taches) traversée par des poussières d'or qui
// montent. Une seule passe WebGL brute, demi-résolution, 30 i/s au plus,
// arrêtée quand l'onglet est caché ; image fixe si le mouvement est réduit.
// La teinte suit la carte survolée : setAtmosphere("#d9a35a").

const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `
precision mediump float;
uniform vec2 uRes;
uniform float uT;
uniform float uScroll;
uniform vec3 uTint;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++) { v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  p.y += uScroll * 0.00012;
  float t = uT * 0.035;
  // Brume : bruit déformé par lui-même, puis « crêtes » = filaments.
  vec2 q = vec2(fbm(p * 1.4 + vec2(t, -t * 0.6)), fbm(p * 1.4 + vec2(-t * 0.8, t) + 3.1));
  float f = fbm(p * 1.8 + q * 1.6 + vec2(t * 0.5, 0.0));
  float ridge = 1.0 - abs(f * 2.0 - 1.0);
  float fil = pow(ridge, 6.0);
  float fog = smoothstep(0.25, 0.95, f);
  // Lumière qui tombe d'en haut à gauche, très douce.
  float light = smoothstep(1.4, -0.2, length(p - vec2(-0.6, 0.75)));
  vec3 base = vec3(0.031, 0.035, 0.051);
  vec3 col = base;
  col += uTint * fog * 0.07 * (0.5 + light);
  col += mix(uTint, vec3(0.95, 0.9, 0.8), 0.4) * fil * 0.11 * (0.35 + light);
  // Poussières d'or : grille de cellules, une particule par cellule, qui monte.
  for (int L = 0; L < 2; L++) {
    float s = L == 0 ? 26.0 : 14.0;
    vec2 g = vec2(uv.x * uRes.x / uRes.y, uv.y) * s;
    g.y -= uT * (L == 0 ? 0.25 : 0.45) + uScroll * 0.0004 * s;
    vec2 id = floor(g);
    vec2 c = fract(g) - 0.5;
    float r = h(id);
    if (r > 0.82) {
      vec2 o = vec2(h(id + 1.3) - 0.5, h(id + 7.1) - 0.5) * 0.7;
      o.x += sin(uT * 0.6 + r * 40.0) * 0.12;
      float d = length(c - o);
      float tw = 0.55 + 0.45 * sin(uT * (1.0 + r * 2.0) + r * 60.0);
      col += mix(vec3(1.0, 0.82, 0.55), uTint, 0.35) * smoothstep(0.06, 0.0, d) * tw * (L == 0 ? 0.35 : 0.6);
    }
  }
  // Vignette + grain.
  col *= 1.0 - 0.55 * pow(length(uv - 0.5) * 1.25, 2.2);
  col += (h(gl_FragCoord.xy + fract(uT) * 91.0) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}`;

let tintTarget: [number, number, number] = [0.85, 0.64, 0.35];
const hex = (c: string): [number, number, number] => {
  const v = parseInt(c.replace("#", ""), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};
export function setAtmosphere(color: string) {
  tintTarget = hex(color);
}

export function Atmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uT = gl.getUniformLocation(prog, "uT");
    const uScroll = gl.getUniformLocation(prog, "uScroll");
    const uTint = gl.getUniformLocation(prog, "uTint");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = 0.5;
    const resize = () => {
      cv.width = Math.max(1, Math.round(window.innerWidth * scale));
      cv.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, cv.width, cv.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const tint = [...tintTarget];
    let raf = 0;
    let last = 0;
    const t0 = performance.now();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || now - last < 33) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // La teinte glisse vers la carte survolée (environ 0,8 s).
      for (let k = 0; k < 3; k++) tint[k] += (tintTarget[k] - tint[k]) * (1 - Math.exp(-dt * 3));
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform1f(uScroll, window.scrollY);
      gl.uniform3f(uTint, tint[0], tint[1], tint[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    if (reduce) {
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, 12);
      gl.uniform1f(uScroll, 0);
      gl.uniform3f(uTint, tint[0], tint[1], tint[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);
  return <canvas ref={ref} className="nf-atmo" aria-hidden />;
}
