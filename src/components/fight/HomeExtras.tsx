import { Pause, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useTournament } from "../tournois/provider";
import { EASE, FONT, IDENTITIES, LINE, LINE_2, PANEL, type FightSlug } from "./identities";

// Deux lectures de tes propres votes, sur l'accueil d'un tournoi :
// ton ADN musical (ce que tu gardes le plus) et tes duels les plus serrés
// (ceux où tu as hésité le plus longtemps), à réécouter.

const fmtS = (ms: number) => (ms >= 60_000 ? `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s` : `${Math.round(ms / 1000)} s`);

export function HomeExtras() {
  const { meta, saved, byId, player, listen } = useTournament();
  const id = IDENTITIES[meta.slug as FightSlug];

  const dna = useMemo(() => {
    const groups = new Map<string, number>();
    const artists = new Map<string, number>();
    for (const v of saved.votes) {
      const p = byId.get(v.winner);
      if (!p) continue;
      groups.set(p.group, (groups.get(p.group) ?? 0) + 1);
      if (p.artist) for (const a of p.artist.split(/\s*(?:&|,|feat\.)\s*/i)) if (a) artists.set(a, (artists.get(a) ?? 0) + 1);
    }
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { groups: top(groups), artists: top(artists), total: saved.votes.length };
  }, [saved.votes, byId]);

  const close = useMemo(
    () =>
      [...saved.votes]
        .filter((v) => v.ms > 6000 && byId.has(v.winner) && byId.has(v.loser))
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 4),
    [saved.votes, byId],
  );

  if (dna.total < 3) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 16, margin: "8px 0 40px", fontFamily: FONT.body, color: id.ink }}>
      <Card id={id} title="Ton ADN musical" text={`D'après tes ${dna.total} votes dans ce tournoi.`}>
        {[
          { label: meta.groupLabel, rows: dna.groups },
          { label: "Artistes", rows: dna.artists },
        ].map((col) =>
          col.rows.length ? (
            <div key={col.label} style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: id.mute }}>{col.label}</p>
              {col.rows.map(([name, n], k) => (
                <div key={name} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "grid", gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                    <span style={{ display: "block", height: 2, background: LINE_2, overflow: "hidden" }}>
                      <motion.i
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(n / col.rows[0][1]) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: EASE, delay: k * 0.06 }}
                        style={{ display: "block", height: "100%", background: k === 0 ? id.a : "#8b8a85" }}
                      />
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: id.mute }}>
                    {n} victoire{n > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : null,
        )}
      </Card>

      {close.length ? (
        <Card id={id} title="Tes duels les plus serrés" text="Ceux où tu as hésité le plus longtemps. Réécoute-les.">
          {close.map((v) => {
            const w = byId.get(v.winner)!;
            const l = byId.get(v.loser)!;
            return (
              <div key={`${v.at}-${v.matchId}`} style={{ display: "grid", gap: 8, paddingBottom: 10, borderBottom: `1px solid ${LINE}` }}>
                <p style={{ margin: 0, fontSize: 12, color: id.mute }}>{fmtS(v.ms)} d'hésitation</p>
                {[w, l].map((p, k) => {
                  const on = player.id === p.id && player.playing;
                  return (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "36px minmax(0, 1fr) auto", alignItems: "center", gap: 10, opacity: k ? 0.6 : 1 }}>
                      <img src={p.thumb} alt="" loading="lazy" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", maxWidth: "none" }} />
                      <span style={{ minWidth: 0, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.title} <span style={{ color: id.mute }}>{k ? "écarté" : "gardé"}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => listen(p)}
                        aria-label={`${on ? "Mettre en pause" : "Écouter"} ${p.title}`}
                        style={{ display: "grid", placeItems: "center", width: 32, height: 32, border: 0, borderRadius: 999, background: on ? id.a : "transparent", boxShadow: `inset 0 0 0 1px ${on ? id.a : LINE_2}`, color: on ? id.bg : id.ink, cursor: "pointer" }}
                      >
                        {on ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>
      ) : null}
    </div>
  );
}

function Card({ id, title, text, children }: { id: (typeof IDENTITIES)[FightSlug]; title: string; text: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, ease: EASE }}
      style={{ display: "grid", gap: 16, alignContent: "start", padding: "20px 22px 22px", borderRadius: 16, background: PANEL, boxShadow: `0 0 0 1px ${LINE}` }}
    >
      <div>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: id.mute }}>
          <span aria-hidden style={{ width: 18, height: 1, background: id.a }} />
          {title}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, color: id.mute }}>{text}</p>
      </div>
      {children}
    </motion.section>
  );
}
