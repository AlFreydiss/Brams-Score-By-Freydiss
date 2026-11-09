// Vérifie que chaque piste YouTube des tournois (jeux, OST) existe encore et
// reste intégrable : oEmbed répond 401/404 quand la vidéo est privée,
// supprimée ou que l'intégration est coupée. Une piste sans « fallback »
// (extrait Apple) devient muette dans ce cas : à remplacer en priorité.
// Usage : node scripts/check-tournois-youtube.mjs
import fs from "node:fs";

const FILES = ["src/lib/tournois/data/jeux.json", "src/lib/tournois/data/ost.json"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let bad = 0;
for (const file of FILES) {
  const list = JSON.parse(fs.readFileSync(file, "utf8")).filter((p) => p.sound?.k === "youtube");
  const ko = [];
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(
      list.slice(i, i + 8).map(async (p) => {
        const r = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${p.sound.id}`).catch(() => null);
        if (!r?.ok) ko.push(`${r?.status ?? "réseau"}  ${p.group} — ${p.title} (${p.sound.id})${p.sound.fallback ? "" : "  ⚠ sans secours"}`);
      }),
    );
    await sleep(300);
  }
  console.log(`${file} : ${list.length - ko.length}/${list.length} OK`);
  for (const l of ko) console.log("  " + l);
  bad += ko.length;
}
process.exitCode = bad ? 1 : 0;
