import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Participant } from "@/lib/tournois/types";
import type { Player } from "../tournois/use-player";
import { fmt } from "../tournois/progress";
import { onPulse } from "./audio/pulse";
import { FONT, type Identity } from "./identities";
import "./player.css";

// Lecteur du duel : une capsule de verre qui prend la couleur du morceau
// (contour, halo, bouton, tête de lecture). À gauche la pochette, au centre le
// titre et une piste où passe la forme d'onde réelle ; elle affiche toujours
// quelque chose : le morceau en écoute, sinon la piste survolée et sa touche.

type Props = {
  id: Identity;
  player: Player;
  playing: Participant | null;
  /** Piste mise en avant quand rien ne joue (survol, focus clavier). */
  ready: Participant | null;
  readyKey: string | null;
  masked: (p: Participant) => string;
  onPlayReady: () => void;
  /** Couleur propre à une piste (jeux : celle du jeu). */
  accentOf?: (p: Participant) => string;
  /** Mode à l'aveugle : pas de pochette. */
  hideArt?: boolean;
};

export function FloatingPlayer({ id, player, playing, ready, readyKey, masked, onPlayReady, accentOf, hideArt }: Props) {
  const wave = useRef<HTMLCanvasElement>(null);
  const now = useRef<HTMLSpanElement>(null);
  const total = useRef<HTMLSpanElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  const seek = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const getTime = player.getTime;
  const isPlaying = !!playing && player.playing;
  const shown = playing ?? ready;
  const acc = shown && accentOf ? accentOf(shown) : id.a;

  useEffect(() => {
    const c = wave.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    c.width = Math.max(1, r.width * dpr);
    c.height = Math.max(1, r.height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const draw = (live: boolean, data?: Float32Array) => {
      const W = c.clientWidth;
      const H = c.clientHeight;
      g.clearRect(0, 0, W, H);
      const t = playing ? getTime() : null;
      const prog = t && t.total ? Math.min(1, t.now / t.total) : 0;
      if (now.current) now.current.textContent = t ? fmt(t.now) : "0:00";
      if (total.current) total.current.textContent = t?.total ? fmt(t.total) : "–:––";
      if (head.current) head.current.style.transform = `translateX(${prog * W}px)`;
      if (seek.current && !dragging.current) seek.current.value = String(Math.round(prog * 1000));
      // Piste : fine, la partie écoutée en dégradé de la couleur du morceau.
      g.fillStyle = "rgba(255,255,255,0.14)";
      g.fillRect(0, H / 2 - 1, W, 2);
      const gr = g.createLinearGradient(0, 0, Math.max(1, W * prog), 0);
      gr.addColorStop(0, acc + "33");
      gr.addColorStop(1, acc);
      g.fillStyle = gr;
      g.fillRect(0, H / 2 - 1, W * prog, 2);
      if (live && data) {
        // Forme d'onde réelle : vive sur la partie écoutée, en filigrane après.
        const cut = W * prog;
        for (const [from, to, alpha] of [[0, cut, 0.95], [cut, W, 0.28]] as const) {
          if (to <= from) continue;
          g.save();
          g.beginPath();
          g.rect(from, 0, to - from, H);
          g.clip();
          g.strokeStyle = alpha > 0.5 ? acc : "#ffffff";
          g.globalAlpha = alpha;
          g.lineWidth = 1.4;
          g.beginPath();
          for (let i = 0; i < data.length; i++) {
            const x = (i / (data.length - 1)) * W;
            const y = H / 2 + data[i] * H * 0.46;
            if (i) g.lineTo(x, y);
            else g.moveTo(x, y);
          }
          g.stroke();
          g.restore();
        }
      }
    };
    draw(false);
    if (!isPlaying) return;
    let last = 0;
    return onPulse((p) => {
      if (p.t - last < 16) return;
      last = p.t;
      draw(p.live, p.wave);
    });
  }, [isPlaying, playing, getTime, acc]);

  const jump = (d: number) => {
    const t = getTime();
    if (!playing || !t) return;
    player.seek(Math.min(Math.max(0, t.now + d), t.total || t.now + Math.max(0, d)));
  };
  const commit = () => {
    dragging.current = false;
    const t = getTime();
    if (!t?.total || !seek.current) return;
    player.seek((Number(seek.current.value) / 1000) * t.total);
  };
  const vol = player.muted ? 0 : player.volume;

  return (
    <motion.div
      className={`fp ${isPlaying ? "is-playing" : ""}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0, transition: { type: "spring", bounce: 0.2, duration: 0.7, delay: 0.3 } }}
      style={{ "--fp-acc": acc, color: id.ink, fontFamily: FONT.body } as React.CSSProperties}
    >
      {/* Pochette : tourne doucement comme un disque pendant l'écoute. */}
      <div className="fp-art" aria-hidden>
        <AnimatePresence initial={false} mode="popLayout">
          {shown && !hideArt ? (
            <motion.img
              key={shown.id}
              src={shown.thumb}
              alt=""
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            />
          ) : (
            <motion.span key="empty" className="fp-art-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {readyKey ?? "♪"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="fp-mid">
        <p className="fp-title">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={shown ? `${shown.id}-${!!playing}` : "none"}
              initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, y: -6, filter: "blur(3px)", transition: { duration: 0.15 } }}
              className="fp-title-in"
            >
              <b>{shown ? masked(shown) : <><span className="fp-hint-mouse">Survole un côté pour l'écouter</span><span className="fp-hint-touch">Appuie sur lecture pour écouter</span></>}</b>
              <em>
                {playing
                  ? hideArt
                    ? "En écoute"
                    : (playing.sub ?? "")
                  : readyKey
                    ? <>
                        <kbd>Espace</kbd> écouter · <kbd>{readyKey}</kbd> garder
                      </>
                    : <>
                        <kbd>A</kbd> ou <kbd>B</kbd> pour garder
                      </>}
              </em>
            </motion.span>
          </AnimatePresence>
        </p>
        <div className="fp-track">
          <span ref={now} className="fp-time">0:00</span>
          <div className="fp-wave">
            <canvas ref={wave} aria-hidden />
            <span ref={head} className="fp-head" aria-hidden style={{ opacity: playing ? 1 : 0 }} />
            <input
              ref={seek}
              type="range"
              min={0}
              max={1000}
              defaultValue={0}
              disabled={!playing}
              aria-label={playing ? `Position dans ${masked(playing)}` : "Aucune piste en lecture"}
              onPointerDown={() => (dragging.current = true)}
              onChange={commit}
              onPointerUp={commit}
              onKeyUp={commit}
            />
          </div>
          <span ref={total} className="fp-time">–:––</span>
        </div>
      </div>

      <div className="fp-ctrl">
        <button type="button" className="fp-btn" disabled={!playing} onClick={() => jump(-10)} aria-label="Reculer de 10 secondes">
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          className="fp-play"
          onClick={() => (playing ? player.toggle(playing) : onPlayReady())}
          aria-label={playing ? (isPlaying ? `Mettre en pause ${masked(playing)}` : `Reprendre ${masked(playing)}`) : ready ? `Écouter ${masked(ready)}` : "Rien à écouter"}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <button type="button" className="fp-btn" disabled={!playing} onClick={() => jump(10)} aria-label="Avancer de 10 secondes">
          <RotateCw size={15} />
        </button>
      </div>

      <div className="fp-vol">
        <button type="button" className="fp-btn" onClick={player.toggleMute} aria-pressed={player.muted} aria-label={player.muted ? "Rétablir le son" : "Couper le son"}>
          {player.muted || player.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={vol}
          onChange={(e) => player.setVolume(Number(e.target.value))}
          aria-label="Volume"
          style={{ "--fp-v": `${vol}%` } as React.CSSProperties}
        />
      </div>
    </motion.div>
  );
}
