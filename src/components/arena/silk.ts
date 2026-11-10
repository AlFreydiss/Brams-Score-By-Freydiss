// Fond du hub : une soie de lumière très sombre, teintée par l'univers du
// tournoi choisi. WebGL brut (pas de three), rendu à demi-résolution et à
// 30 images/s, arrêté dès que la scène sort de l'écran. La gauche reste noire
// (le texte s'y pose) et le bas se fond dans la page.

const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform vec3 uCol;
uniform vec3 uFocus;
uniform float uBoost;

float hash(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 q = vec2(uv.x * uRes.x / uRes.y, uv.y);
  float a = -0.62;
  vec2 t = mat2(cos(a), -sin(a), sin(a), cos(a)) * (q * 0.78);
  t.y += 0.035 * sin(7.0 * t.x - uT);
  float s = 0.6 + 0.4 * sin(5.0 * (t.x + t.y + cos(3.0 * t.x + 5.0 * t.y) + 0.02 * uT) + 0.5 * sin(16.0 * (t.x + t.y - 0.1 * uT)));
  float n = clamp((s - 0.2) / 0.8, 0.0, 1.0);
  float fold = pow(n, 3.2);
  // Noir à gauche (texte), plein à droite ; fondu en bas vers la page, léger en haut.
  float m = smoothstep(0.08, 0.92, uv.x) * smoothstep(0.0, 0.42, uv.y) * (1.0 - 0.45 * smoothstep(0.7, 1.0, uv.y));
  vec3 bg = vec3(0.0314, 0.0353, 0.051);
  vec3 col = bg + uCol * fold * 0.3 * m + vec3(1.0, 0.97, 0.92) * pow(n, 11.0) * 0.07 * m;
  // Halo de l'écran du centre : il éclaire la soie autour de lui.
  vec2 fd = (uv - uFocus.xy) * vec2(uRes.x / uRes.y, 1.0);
  float halo = exp(-dot(fd, fd) / (uFocus.z * uFocus.z));
  col += uCol * halo * (0.07 + 0.13 * fold) * (1.0 + 3.0 * uBoost);
  col += uCol * fold * m * 0.5 * uBoost;
  col += (hash(gl_FragCoord.xy + fract(uT)) - 0.5) / 255.0 * 1.6;
  gl_FragColor = vec4(col, 1.0);
}`;

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const v = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

export type Silk = {
  setColor(hex: string): void;
  /** Centre et rayon du halo, en fractions de la scène (y vers le bas). */
  setFocus(x: number, y: number, r: number): void;
  /** Lancement d'un tournoi : la soie accélère et s'illumine. */
  boost(): void;
  destroy(): void;
};

export function createSilk(canvas: HTMLCanvasElement, color: string): Silk | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return null;
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
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "uRes");
  const uT = gl.getUniformLocation(prog, "uT");
  const uCol = gl.getUniformLocation(prog, "uCol");
  const uFocus = gl.getUniformLocation(prog, "uFocus");
  const uBoost = gl.getUniformLocation(prog, "uBoost");
  let boost = 0;
  let boostTo = 0;
  let focus: [number, number, number] = [0.68, 0.5, 0.4];

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cur = rgb(color);
  let target = cur.slice() as [number, number, number];
  let raf = 0;
  let last = 0;
  let time = Math.random() * 40;
  let visible = true;

  const size = () => {
    const w = Math.max(2, Math.round(canvas.clientWidth * 0.5));
    const h = Math.max(2, Math.round(canvas.clientHeight * 0.5));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  const draw = () => {
    size();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, time);
    gl.uniform3f(uCol, cur[0], cur[1], cur[2]);
    gl.uniform3f(uFocus, focus[0], 1 - focus[1], focus[2]);
    gl.uniform1f(uBoost, boost);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (now - last < 33) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    boost += (boostTo - boost) * Math.min(1, dt * 5);
    time += dt * (0.55 + boost * 7);
    for (let k = 0; k < 3; k++) cur[k] += (target[k] - cur[k]) * Math.min(1, dt * 2.2);
    draw();
  };
  const run = () => {
    cancelAnimationFrame(raf);
    if (still || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    run();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(() => draw());
  ro.observe(canvas);
  document.addEventListener("visibilitychange", run);
  draw();
  run();

  return {
    setColor(hex) {
      target = rgb(hex);
      // Mouvement réduit : pas de boucle, la couleur change d'un coup.
      if (still) {
        cur[0] = target[0];
        cur[1] = target[1];
        cur[2] = target[2];
        draw();
      }
    },
    boost() {
      boostTo = 1;
    },
    setFocus(x, y, r) {
      focus = [x, y, r];
      if (still) draw();
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", run);
    },
  };
}
