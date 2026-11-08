import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Participant } from "@/lib/tournois/types";
import type { Player } from "../tournois/use-player";
import { fmt } from "../tournois/progress";
import { onPulse } from "./audio/pulse";
import { FONT, type Identity } from "./identities";

// Lecteur flottant minimal : il affiche toujours quelque chose — le morceau en
// écoute et sa forme d'onde réelle (ou sa progression si le son n'est pas
// lisible), sinon la piste mise en avant et la touche pour la lancer.

type Props = {
  id: Identity;
  player: Player;
  playing: Participant | null;
  /** Piste mise en avant quand rien ne joue (survol, focus clavier). */
  ready: Participant | null;
  readyKey: string | null;
  masked: (p: Participant) => string;
  onPlayReady: () => void;
};

export function FloatingPlayer({ id, player, playing, ready, readyKey, masked, onPlayReady }: Props) {
  const wave = useRef<HTMLCanvasElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const seek = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const getTime = player.getTime;
  const isPlaying = !!playing && player.playing;

  useEffect(() => {
    const c = wave.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      const r = c.getBoundingClientRect();
      c.width = Math.max(1, r.width * dpr);
      c.height = Math.max(1, r.height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const draw = (live: boolean, data?: Float32Array) => {
      const W = c.clientWidth;
      const H = c.clientHeight;
      g.clearRect(0, 0, W, H);
      const t = playing ? getTime() : null;
      const prog = t && t.total ? t.now / t.total : 0;
      if (time.current) time.current.textContent = t ? `${fmt(t.now)} / ${t.total ? fmt(t.total) : "–:––"}` : "0:00";
      if (seek.current && !dragging.current) seek.current.value = String(Math.round(prog * 1000));
      // Fond : la piste entière, la partie écoutée à la couleur du tournoi.
      g.fillStyle = "rgba(255,255,255,0.16)";
      g.fillRect(0, H / 2 - 1, W, 2);
      g.fillStyle = id.a;
      g.fillRect(0, H / 2 - 1, W * prog, 2);
      if (live && data) {
        // Forme d'onde réelle par-dessus, centrée.
        g.strokeStyle = id.b;
        g.globalAlpha = 0.9;
        g.lineWidth = 1.5;
        g.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * W;
          const y = H / 2 + data[i] * H * 0.45;
          if (i) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
        g.globalAlpha = 1;
      }
    };
    draw(false);
    if (!isPlaying) return;
    let last = 0;
    const off = onPulse((p) => {
      // La forme d'onde à chaque image ; le temps 4 fois par seconde suffit, mais le dessin est commun.
      if (p.t - last < 16) return;
      last = p.t;
      draw(p.live, p.wave);
    });
    return off;
  }, [isPlaying, playing, getTime, id]);

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
  const btn: React.CSSProperties = { display: "grid", placeItems: "center", width: 36, height: 36, border: 0, borderRadius: 999, background: "transparent", color: id.ink, cursor: "pointer" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0, transition: { type: "spring", bounce: 0.2, duration: 0.7, delay: 0.3 } }}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 18,
        translate: "-50% 0",
        zIndex: 25,
        width: "min(760px, calc(100% - 24px))",
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 14,
        padding: "8px 12px 8px 8px",
        borderRadius: 18,
        background: "rgba(10,10,12,0.72)",
        backdropFilter: "blur(20px) saturate(140%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1), 0 24px 60px -24px rgba(0,0,0,0.9)",
        color: id.ink,
        fontFamily: FONT.body,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button type="button" style={{ ...btn, opacity: playing ? 1 : 0.35 }} disabled={!playing} onClick={() => jump(-10)} aria-label="Reculer de 10 secondes">
          <SkipBack size={15} />
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          style={{ ...btn, width: 44, height: 44, background: id.ink, color: id.bg }}
          onClick={() => (playing ? player.toggle(playing) : onPlayReady())}
          aria-label={playing ? (isPlaying ? `Mettre en pause ${masked(playing)}` : `Reprendre ${masked(playing)}`) : ready ? `Écouter ${masked(ready)}` : "Rien à écouter"}
        >
          {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        </motion.button>
        <button type="button" style={{ ...btn, opacity: playing ? 1 : 0.35 }} disabled={!playing} onClick={() => jump(10)} aria-label="Avancer de 10 secondes">
          <SkipForward size={15} />
        </button>
      </div>
      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {playing ? masked(playing) : ready ? `Prêt : ${masked(ready)}` : "Survole un côté pour l'écouter"}
          <span style={{ marginLeft: 10, fontWeight: 400, color: id.mute }}>
            {playing ? (playing.sub ?? "") : readyKey ? `Espace pour écouter, ${readyKey} pour garder` : "A ou B pour garder"}
          </span>
        </p>
        <div style={{ position: "relative", height: 26 }}>
          <canvas ref={wave} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
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
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: playing ? "pointer" : "default" }}
          />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span ref={time} style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: id.mute, minWidth: 74, textAlign: "right" }}>
          0:00
        </span>
        <button type="button" style={btn} onClick={player.toggleMute} aria-pressed={player.muted} aria-label={player.muted ? "Rétablir le son" : "Couper le son"}>
          {player.muted || player.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={vol}
          onChange={(e) => player.setVolume(Number(e.target.value))}
          aria-label="Volume"
          style={{ width: 80, accentColor: id.a, cursor: "pointer" }}
        />
      </div>
    </motion.div>
  );
}
