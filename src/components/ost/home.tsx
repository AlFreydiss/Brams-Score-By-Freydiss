import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Sparkle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { currentMatch } from "@/lib/tournois/bracket";
import { fill } from "@/lib/tournois/catalog";
import { useClientDraw } from "@/lib/tournois/client-draw";
import { actions, draw } from "@/lib/tournois/store";
import { useTournament } from "../tournois/provider";
import { Backdrop } from "./backdrop";
import { Depth, Plane, useSpace } from "./space";
import { T } from "./tokens";
import { engrave, Photo, Press } from "./ui";

// Accueil, en affiche de film : le fond de salle avec deux OST du catalogue,
// le titre gravé qui monte derrière son masque, le départ (taille du tableau,
// à l'aveugle, animes), et à droite un éventail de trois cartes qui s'ouvre au
// survol. En descendant, les règles.

const RISE: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: (k: number) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay: 0.5 + k * 0.08, ease: T.ease.out } }),
};
const FAN: Variants = {
  hidden: { opacity: 0, y: 40 },
  shown: (k: number) => ({ opacity: 1, y: 0, transition: { duration: 1.1, delay: 0.25 + k * 0.1, ease: T.ease.out } }),
};

/** Une ligne de titre qui monte derrière un masque. */
function Line({ children, delay }: { children: React.ReactNode; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="ox-mask">
      <motion.span initial={reduce ? false : { y: "108%" }} animate={{ y: 0, transition: { duration: 1.1, delay, ease: T.ease.out } }}>
        {children}
      </motion.span>
    </span>
  );
}

export function HomePlane({ onPractice }: { onPractice: () => void }) {
  const { meta, participants, saved } = useTournament();
  const { goTo } = useSpace();
  const reduce = useReducedMotion();
  const art = useClientDraw("ost:space-art", participants.filter((p) => p.visual.k === "img"), 5) ?? [];
  const [size, setSize] = useState(meta.defaultFormat);
  const [blind, setBlind] = useState(false);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [showGroups, setShowGroups] = useState(false);
  // « Nouvelle partie » efface celle en cours : un second appui confirme.
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);

  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of participants) m.set(p.group, (m.get(p.group) ?? 0) + 1);
    return [...m].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [participants]);
  const pool = participants.filter((p) => !off.has(p.group));
  const fits = meta.formats.filter((f) => f <= pool.length);
  const format = fits.includes(size) ? size : fits[fits.length - 1];

  const run = saved.run;
  const cur = run ? currentMatch(run.rounds) : null;
  const played = run ? run.rounds.reduce((n, r) => n + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0) : 0;

  const start = () => {
    if (!format) return;
    setConfirm(false);
    actions.start(meta.slug, draw(pool, format), blind);
    goTo(1);
  };
  // Flèches dans la taille du tableau : d'une taille disponible à l'autre.
  const stepSize = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d || !format) return;
    e.preventDefault();
    e.stopPropagation();
    const next = fits[fits.indexOf(format) + d];
    if (!next) return;
    setSize(next);
    (e.currentTarget.querySelector(`[data-size="${next}"]`) as HTMLElement | null)?.focus();
  };
  const toggle = (g: string) =>
    setOff((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  return (
    <Plane i={0} label="Accueil">
      <div className="ox-room">
        <Backdrop k="home" pair={art.length >= 5 ? [art[3], art[4]] : null} />
        <div className="ox-home">
          <motion.div className="ox-home-text" initial={reduce ? false : "hidden"} animate="shown">
            <motion.p className="ox-home-mark" variants={RISE} custom={0}>
              <Sparkle size={18} strokeWidth={1} aria-hidden />
              <span className="ox-micro">
                {participants.length} OST, {groups.length} animes
              </span>
            </motion.p>
            <Depth depth={-0.08}>
              <h1 className="ox-home-title">
                <Line delay={0.15}>
                  <span className="ox-initial">T</span>ournoi
                </Line>
                <Line delay={0.27}>
                  <span className="ox-initial">D</span>'OST
                </Line>
              </h1>
            </Depth>
            <motion.p className="ox-lead" variants={RISE} custom={1}>
              {fill(meta.lead, participants)}
            </motion.p>
            <motion.div className="ox-cta" variants={RISE} custom={2}>
              {run && cur ? (
                <>
                  <Press className="ox-pill ox-pill--gold" onClick={() => goTo(1)}>
                    Reprendre au duel {played + 1}
                  </Press>
                  <Press className={`ox-pill ${confirm ? "ox-pill--gold" : ""}`} onClick={confirm ? start : () => setConfirm(true)} aria-live="polite">
                    {confirm ? "Confirmer : effacer la partie" : "Nouvelle partie"}
                  </Press>
                </>
              ) : (
                <>
                  <Press className="ox-pill ox-pill--gold" onClick={start} disabled={!format}>
                    Commencer
                  </Press>
                  <Press className="ox-pill" onClick={onPractice}>
                    Essayer un duel
                  </Press>
                </>
              )}
            </motion.div>

            <motion.div className="ox-setup" variants={RISE} custom={3}>
              <div className="ox-setup-row">
                <span className="ox-setup-label">Taille du tableau</span>
                <div className="ox-sizes" role="radiogroup" aria-label="Taille du tableau" onKeyDown={stepSize}>
                  {meta.formats.map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      data-size={f}
                      aria-checked={format === f}
                      tabIndex={format === f ? 0 : -1}
                      disabled={f > pool.length}
                      className="ox-size"
                      onClick={() => setSize(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ox-setup-row">
                <label className="ox-toggle">
                  <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
                  <i aria-hidden />
                  <span>À l'aveugle</span>
                </label>
                <button type="button" className="ox-link" onClick={() => setShowGroups((v) => !v)} aria-expanded={showGroups}>
                  Animes : {off.size ? `${groups.length - off.size} sur ${groups.length}` : `les ${groups.length}`}
                </button>
              </div>
              <AnimatePresence initial={false}>
                {showGroups ? (
                  <motion.div
                    className="ox-groups"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto", transition: { duration: 0.4, ease: T.ease.out } }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                  >
                    <div className="ox-groups-in">
                      {groups.map(([g, n]) => (
                        <button key={g} type="button" className="ox-chip" aria-pressed={!off.has(g)} onClick={() => toggle(g)}>
                          {g} <small>{n}</small>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* L'éventail : trois cartes, la plus proche au centre. */}
          <Depth depth={0.08} className="ox-fan" style={{}}>
            {art.slice(0, 3).map((p, k) => (
              <motion.div
                key={p.id}
                className={`ox-fan-card ox-fan-card--${k}`}
                variants={FAN}
                custom={k}
                initial={reduce ? false : "hidden"}
                animate="shown"
                aria-hidden
              >
                <span className="ox-card-img">
                  <Photo p={p} eager portrait={0.62} sizes="(min-height: 900px) 900px, 700px" />
                </span>
                <span className="ox-fan-info">
                  <span className="ox-micro">{p.sub ?? p.group}</span>
                  <b>{engrave(p.title)}</b>
                </span>
              </motion.div>
            ))}
          </Depth>
        </div>

        <div className="ox-rules">
          <h2 className="ox-h2">Comment ça se joue</h2>
          <ol className="ox-steps">
            <li>
              <b>I</b>
              <p>Deux OST face à face. Touche une carte pour écouter son extrait de 30 secondes.</p>
            </li>
            <li>
              <b>II</b>
              <p>Garde ta préférée. Elle passe au tour suivant, l'autre quitte le tournoi.</p>
            </li>
            <li>
              <b>III</b>
              <p>Duel après duel, jusqu'à la finale. Tes choix comptent aussi dans le classement du site.</p>
            </li>
          </ol>
          <p className="ox-hint">Glisse vers la gauche, ou utilise les flèches du clavier, pour passer d'un plan à l'autre.</p>
        </div>
      </div>
    </Plane>
  );
}
