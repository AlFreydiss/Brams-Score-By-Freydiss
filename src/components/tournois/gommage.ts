// Transitions signatures des tournois « Fight Night ». L'image (ou la vidéo)
// qui s'en va est redessinée dans un canvas WebGL et disparaît à la façon de
// son univers ; la suivante est déjà en place dessous (DOM).
//   burn  : OST de jeux vidéo, le Gommage de Clair Obscur (bord qui brûle,
//           pétales, étincelles, cendres)
//   tv    : openings, changement de chaîne cathodique (neige, décalage RVB,
//           l'image s'écrase en une ligne puis un point)
//   vinyl : OST, balayage circulaire qui tourne comme un disque, sillons
//           et poussière dorée sur le bras
//   dust  : endings, dissolution lente en poussière qui retombe
//
// WebGL brut (pas de three.js : ces pages ne doivent pas charger le chunk 3D).

//   pixel : jeux rétro, l'image se pixelise puis tombe bloc par bloc
export type TransitionMode = "burn" | "tv" | "vinyl" | "dust" | "pixel";
const MODE: Record<TransitionMode, number> = { burn: 0, tv: 1, vinyl: 2, dust: 3, pixel: 4 };
const DUR: Record<TransitionMode, number> = { burn: 2100, tv: 950, vinyl: 1500, dust: 2400, pixel: 1400 };

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision highp float;
uniform sampler2D tex;
uniform vec2 res;      // taille du canvas en px CSS
uniform float dpr;
uniform float t;       // seuil (burn, dust) ou angle balayé (vinyl)
uniform float pr;      // avancement 0 → 1
uniform float tm;      // horloge (s)
uniform float mode;
uniform vec3 xf;       // échelle, origine x, origine y de l'élément à l'écran
uniform vec4 fit;      // ox, oy, largeur, hauteur de l'image dessinée (object-fit)
uniform vec4 box;      // zone qui disparaît (x, y, l, h)
uniform float dir;     // 1 : part de la droite, -1 : de la gauche
uniform vec3 ec;       // couleur du bord (braise, givre, néon… selon le jeu)
float h(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 q){float s=0.,a=.5;for(int k=0;k<5;k++){s+=a*n(q);q*=2.03;a*=.5;}return s;}
vec2 texAt(vec2 P){vec2 L=(P-xf.yz)/xf.x;return clamp((L-fit.xy)/fit.zw,0.,1.);}
void main(){
  vec2 P=vec2(gl_FragCoord.x,res.y*dpr-gl_FragCoord.y)/dpr;
  vec2 u=(P-box.xy)/box.zw;
  if(u.x<0.||u.y<0.||u.x>1.||u.y>1.){gl_FragColor=vec4(0.);return;}
  vec2 q=u*vec2(box.z/box.w,1.);
  vec3 rgb;float a=1.;

  if(mode<.5){
    // ── burn ──
    float m=.62*fbm(q*2.6)+.38*(dir>0.?1.-u.x:u.x);
    m+=.035*(n(q*38.)-.5)+.015*(n(q*110.)-.5);
    float d=m-t;
    if(d<0.){gl_FragColor=vec4(0.);return;}
    vec3 col=texture2D(tex,texAt(P)).rgb;
    float hot=1.-smoothstep(0.,.0045,d);
    float ember=1.-smoothstep(.0,.016,d);
    float scorch=1.-smoothstep(.0,.075,d);
    rgb=mix(col,col*vec3(.42,.3,.22),scorch*.85);
    rgb=mix(rgb,ec,ember*.85);
    rgb=mix(rgb,mix(ec,vec3(1.,.95,.82),.75),hot);
    a=smoothstep(0.,.002,d);
  } else if(mode<1.5){
    // ── tv : neige, l'image s'écrase en ligne puis en point ──
    float c=smoothstep(.22,.68,pr), w=smoothstep(.68,.94,pr);
    float hh=.5*(1.-c)+.0025, hw=.5*(1.-w)+.002;
    vec2 d=u-.5;
    if(abs(d.y)>hh||abs(d.x)>hw){gl_FragColor=vec4(0.);return;}
    vec2 u2=.5+d*(.5/vec2(hw,hh));
    vec2 P2=box.xy+clamp(u2,0.,1.)*box.zw;
    float jit=(h(vec2(floor(P.y*.35),floor(tm*24.)))-.5)*28.*smoothstep(.05,.4,pr)*(1.-c);
    P2.x+=jit;
    float o=6.*pr;
    rgb=vec3(texture2D(tex,texAt(P2+vec2(o,0.))).r,texture2D(tex,texAt(P2)).g,texture2D(tex,texAt(P2-vec2(o,0.))).b);
    float snow=h(floor(P*.6)+floor(tm*40.)*7.13);
    rgb=mix(rgb,vec3(snow),smoothstep(0.,.3,pr)*.55*(1.-c*.5));
    rgb*=.82+.18*sin(P.y*3.1416);
    rgb=mix(rgb,vec3(1.,.98,.95),c*.9);
    a=1.-smoothstep(.9,1.,pr);
  } else if(mode<2.5){
    // ── vinyl : le disque tourne et un bras balaie l'image ──
    vec2 cpx=box.xy+box.zw*.5;
    vec2 dv=P-cpx;
    float r=length(dv);
    float ang=fract(atan(dv.x,-dv.y)/6.28318+1.);
    float groove=.006*sin(r*.35);
    float d=ang-t+groove;
    if(d<0.){gl_FragColor=vec4(0.);return;}
    float rot=pr*.5;
    vec2 rv=vec2(cos(rot)*dv.x-sin(rot)*dv.y,sin(rot)*dv.x+cos(rot)*dv.y)*(1.+pr*.06);
    vec3 col=texture2D(tex,texAt(cpx+rv)).rgb;
    float edge=1.-smoothstep(0.,.006,d);
    float near=1.-smoothstep(0.,.08,d);
    rgb=col*(1.-.35*near*(.5+.5*sin(r*.9)));
    rgb=mix(rgb,vec3(1.,.82,.52),edge*.9);
    a=smoothstep(0.,.0015,d);
  } else if(mode<3.5){
    // ── dust : dissolution douce, de haut en bas ──
    float m=.68*fbm(q*5.)+.32*u.y;
    m+=.02*(n(q*90.)-.5);
    float d=m-t;
    if(d<0.){gl_FragColor=vec4(0.);return;}
    vec3 col=texture2D(tex,texAt(P)).rgb;
    float lum=dot(col,vec3(.3,.59,.11));
    float near=1.-smoothstep(0.,.07,d);
    float edge=1.-smoothstep(0.,.018,d);
    rgb=mix(col,vec3(lum)*vec3(1.05,.97,.88),near*.7);
    rgb=mix(rgb,mix(ec,vec3(1.),.45),edge*.7);
    a=smoothstep(0.,.03,d);
  } else {
    // ── pixel : l'image se pixelise, puis les blocs tombent au hasard ──
    float ps=max(1.,floor(mix(1.,22.,smoothstep(0.,.45,pr))));
    vec2 lq=floor((P-box.xy)/ps)*ps+box.xy+ps*.5;
    vec2 cell=floor((P-box.xy)/22.);
    float d=h(cell)-(pr*1.25-.15);
    if(d<0.){gl_FragColor=vec4(0.);return;}
    rgb=texture2D(tex,texAt(lq)).rgb;
    rgb=mix(rgb,ec,(1.-smoothstep(0.,.07,d))*.8);
  }
  gl_FragColor=vec4(rgb*a,a);
}`;

// Même bruit côté JS pour faire naître les particules exactement sur le bord.
const fr = (x: number) => x - Math.floor(x);
const hh = (x: number, y: number) => fr(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const nn = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hh(ix, iy), b = hh(ix + 1, iy), c = hh(ix, iy + 1), d = hh(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const fbm = (x: number, y: number) => {
  let s = 0, a = 0.5;
  for (let k = 0; k < 5; k++) {
    s += a * nn(x, y);
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return s;
};

// 0 pétale, 1 étincelle, 2 cendre, 3 poussière dorée (vinyl), 4 poussière pâle (dust), 5 pixel
type Kind = 0 | 1 | 2 | 3 | 4 | 5;
type Part = { x: number; y: number; vx: number; vy: number; r: number; w: number; a: number; life: number; age: number; kind: Kind };
const PETAL = ["#e0484c", "#c22f36", "#9d1f27"];

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** edge : couleur du bord (rvb 0-1) ; parts : couleurs des particules (pétales, éclats, pixels…). */
export type StartOpts = { box?: { x: number; y: number; w: number; h: number }; dir?: 1 | -1; mode?: TransitionMode; edge?: [number, number, number]; parts?: string[] };

export class Gommage {
  private gl: WebGLRenderingContext | null = null;
  private glc: HTMLCanvasElement;
  private pc: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private tex: WebGLTexture | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private parts: Part[] = [];
  private palette: string[] | null = null;

  constructor(private host: HTMLElement) {
    const mk = (z: number) => {
      const c = document.createElement("canvas");
      c.setAttribute("aria-hidden", "true");
      Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: String(z) });
      host.appendChild(c);
      return c;
    };
    this.glc = mk(3);
    this.pc = mk(4);
    this.ctx = this.pc.getContext("2d");
    const gl = this.glc.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const k of ["res", "dpr", "t", "pr", "tm", "mode", "xf", "fit", "box", "dir", "ec"]) this.u[k] = gl.getUniformLocation(pr, k);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    this.gl = gl;
  }

  /**
   * Fait disparaître `el` (à appeler AVANT que React ne change ses classes).
   * Sans `box`, l'élément remplit l'hôte et sa transformation CSS est relue ;
   * avec `box` (zone à l'écran, relative à l'hôte), on efface cette zone.
   */
  start(el: HTMLImageElement | HTMLVideoElement, opts: StartOpts = {}) {
    const gl = this.gl;
    if (!gl) return false;
    const iw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
    const ih = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
    if (!iw || !ih) return false;
    cancelAnimationFrame(this.raf);
    const mode = opts.mode ?? "burn";

    const W = this.host.clientWidth, H = this.host.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const c of [this.glc, this.pc]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    gl.viewport(0, 0, this.glc.width, this.glc.height);

    // Où se trouve l'élément à l'écran : sa taille propre (EW×EH), son échelle
    // et son origine dans l'hôte.
    let EW = W, EH = H, s = 1, ox = 0, oy = 0;
    const box = opts.box ?? { x: 0, y: 0, w: W, h: H };
    if (opts.box) {
      const hr = this.host.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      EW = el.offsetWidth || er.width;
      EH = el.offsetHeight || er.height;
      s = er.width / EW;
      ox = er.left - hr.left;
      oy = er.top - hr.top;
    } else {
      // Mouvement de caméra en cours, figé à l'instant T (origine au centre).
      const m = getComputedStyle(el).transform;
      let tx = 0, ty = 0;
      const v = m && m !== "none" ? m.match(/-?[\d.e]+/g)!.map(Number) : null;
      if (v && v.length === 6) [s, , , , tx, ty] = v;
      else if (v && v.length === 16) [s, tx, ty] = [v[0], v[12], v[13]];
      ox = (W / 2) * (1 - s) + tx;
      oy = (H / 2) * (1 - s) + ty;
    }
    // object-fit: cover + object-position.
    const [px, py] = getComputedStyle(el).objectPosition.split(" ").map((p) => parseFloat(p) / 100);
    const k = Math.max(EW / iw, EH / ih);
    const dw = iw * k, dh = ih * k;
    const dir = opts.dir ?? 1;

    gl.uniform2f(this.u.res, W, H);
    gl.uniform1f(this.u.dpr, dpr);
    gl.uniform1f(this.u.mode, MODE[mode]);
    gl.uniform3f(this.u.xf, s, ox, oy);
    gl.uniform4f(this.u.fit, (EW - dw) * (isNaN(px) ? 0.5 : px), (EH - dh) * (isNaN(py) ? 0.5 : py), dw, dh);
    gl.uniform4f(this.u.box, box.x, box.y, box.w, box.h);
    gl.uniform1f(this.u.dir, dir);
    const ec = opts.edge ?? [0.86, 0.34, 0.08];
    gl.uniform3f(this.u.ec, ec[0], ec[1], ec[2]);
    this.palette = opts.parts?.length ? opts.parts : null;

    const upload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
    };
    try {
      upload();
    } catch {
      return false;
    }
    const isVideo = el instanceof HTMLVideoElement;
    this.parts = [];
    const t0 = performance.now();
    let last = t0;
    const aspect = box.w / box.h;
    const dur = DUR[mode];
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const maxR = Math.hypot(box.w, box.h) / 2;

    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const thr = mode === "vinyl" ? -0.03 + ease(p) * 1.06 : -0.06 + ease(p) * 1.12;
      if (isVideo && mode !== "tv") upload();
      gl.uniform1f(this.u.t, thr);
      gl.uniform1f(this.u.pr, p);
      gl.uniform1f(this.u.tm, now / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (p < 0.97) this.spawn(mode, mode === "pixel" ? p * 1.25 - 0.15 : thr, box, aspect, dir, cx, cy, maxR);
      this.draw(dt, now, dpr, W, H, dir);

      if (p < 1 || this.parts.length) this.raf = requestAnimationFrame(frame);
      else this.clear();
    };
    frame(t0);
    this.raf = requestAnimationFrame(frame);
    return true;
  }

  // Particules nées sur le bord, selon l'univers.
  private spawn(mode: TransitionMode, thr: number, box: { x: number; y: number; w: number; h: number }, aspect: number, dir: number, cx: number, cy: number, maxR: number) {
    if (mode === "tv") return;
    if (mode === "pixel") {
      const p = thr; // seuil courant (même calcul que le shader : pr*1.25-.15)
      for (let i = 0; i < 90 && this.parts.length < 360; i++) {
        const cx_ = Math.floor(Math.random() * Math.ceil(box.w / 22)), cy_ = Math.floor(Math.random() * Math.ceil(box.h / 22));
        if (Math.abs(hh(cx_, cy_) - p) > 0.015) continue;
        this.parts.push({ x: box.x + cx_ * 22 + 11, y: box.y + cy_ * 22 + 11, vx: (Math.random() - 0.5) * 60, vy: -(20 + Math.random() * 80), r: 4 + Math.random() * 6, w: 0, a: 0, life: 0.9 + Math.random() * 0.8, age: 0, kind: 5 });
      }
      return;
    }
    if (mode === "vinyl") {
      // Poussière dorée le long du bras qui balaie.
      const a = thr * Math.PI * 2;
      for (let i = 0; i < 6; i++) {
        const r = Math.sqrt(Math.random()) * maxR;
        const x = cx + Math.sin(a) * r, y = cy - Math.cos(a) * r;
        if (x < box.x || y < box.y || x > box.x + box.w || y > box.y + box.h) continue;
        const sp = 20 + Math.random() * 60;
        this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.6 + Math.random() * 1.6, w: 0, a: 0, life: 0.7 + Math.random() * 0.9, age: 0, kind: 3 });
      }
      return;
    }
    const dust = mode === "dust";
    for (let i = 0; i < 260 && this.parts.length < 420; i++) {
      const ux = Math.random(), uy = Math.random();
      const mm = dust ? 0.68 * fbm(ux * aspect * 5, uy * 5) + 0.32 * uy : 0.62 * fbm(ux * aspect * 2.6, uy * 2.6) + 0.38 * (dir > 0 ? 1 - ux : ux);
      if (Math.abs(mm - thr) < (dust ? 0.008 : 0.01) && Math.random() < (dust ? 0.5 : 0.4)) {
        const x = box.x + ux * box.w, y = box.y + uy * box.h;
        if (dust) {
          this.parts.push({ x, y, vx: (Math.random() - 0.5) * 14, vy: 10 + Math.random() * 30, r: 0.5 + Math.random() * 1.4, w: 0, a: 0, life: 1.4 + Math.random() * 1.6, age: 0, kind: 4 });
          continue;
        }
        const z = Math.random();
        const kind: Kind = z < 0.4 ? 0 : z < 0.7 ? 1 : 2;
        this.parts.push({
          x, y,
          vx: dir * (30 + Math.random() * (kind === 1 ? 140 : 80)), vy: -(20 + Math.random() * (kind === 1 ? 110 : 60)),
          r: kind === 0 ? 5 + Math.random() * 6 : kind === 1 ? 0.7 + Math.random() * 1.2 : 1.5 + Math.random() * 3,
          w: Math.random() * 6.28, a: (Math.random() - 0.5) * (kind === 0 ? 5 : 9),
          life: kind === 1 ? 0.6 + Math.random() * 0.8 : 1.1 + Math.random() * 1.4, age: 0, kind,
        });
      }
    }
  }

  private draw(dt: number, now: number, dpr: number, W: number, H: number, dir: number) {
    const ctx = this.ctx!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const q of this.parts) {
      q.age += dt;
      if (q.kind <= 2) {
        q.vx += (Math.sin(q.y * 0.012 + now * 0.002) * 60 + 25 * dir) * dt;
        q.vy -= 18 * dt;
      } else if (q.kind === 5) {
        q.vy += 260 * dt;
      } else if (q.kind === 4) {
        q.vx += Math.sin(q.y * 0.02 + now * 0.001) * 8 * dt;
        q.vy += 6 * dt;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.w += q.a * dt;
      const f = 1 - q.age / q.life;
      if (f <= 0) continue;
      ctx.globalAlpha = Math.min(1, f * 1.6);
      if (q.kind === 5) {
        ctx.fillStyle = this.palette ? this.palette[Math.floor(q.r * 7) % this.palette.length] : "#ffffff";
        const s = Math.round(q.r);
        ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s);
        continue;
      }
      if (q.kind === 1 || q.kind === 3) {
        // Étincelle / poussière dorée : point chaud avec une petite traînée.
        ctx.strokeStyle = q.kind === 1 ? (this.palette?.[1] ?? "#ffe2a0") : "#f3cf8e";
        ctx.lineWidth = q.r;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03);
        ctx.stroke();
        continue;
      }
      if (q.kind === 4) {
        ctx.fillStyle = this.palette?.[0] ?? "#f1e4cf";
        ctx.globalAlpha *= 0.7;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, 6.283);
        ctx.fill();
        continue;
      }
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.w);
      // La largeur « respire » : le pétale tourne sur lui-même en tombant.
      ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(q.w * 0.8 + q.r)));
      const r = q.r;
      ctx.beginPath();
      if (q.kind === 0) {
        const pal = this.palette ?? PETAL;
        ctx.fillStyle = pal[Math.floor(q.r) % pal.length];
        ctx.moveTo(-r, 0);
        ctx.quadraticCurveTo(-r * 0.2, -r * 0.75, r, -r * 0.08);
        ctx.quadraticCurveTo(r * 0.45, r * 0.12, r * 0.55, r * 0.02);
        ctx.quadraticCurveTo(-r * 0.2, r * 0.6, -r, 0);
      } else {
        // Cendre : éclat sombre irrégulier.
        ctx.globalAlpha *= 0.85;
        ctx.fillStyle = "#1b1310";
        ctx.moveTo(-r, -r * 0.3);
        ctx.lineTo(r * 0.4, -r * 0.7);
        ctx.lineTo(r, r * 0.2);
        ctx.lineTo(-r * 0.2, r * 0.6);
      }
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    this.parts = this.parts.filter((q) => q.age < q.life);
  }

  clear() {
    cancelAnimationFrame(this.raf);
    this.gl?.clear(this.gl.COLOR_BUFFER_BIT);
    this.ctx?.clearRect(0, 0, this.pc.width, this.pc.height);
    this.parts = [];
  }

  destroy() {
    this.clear();
    this.glc.remove();
    this.pc.remove();
    const lose = this.gl?.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  }
}
