import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

// draw.ts est en TypeScript : on le compile à la volée pour le tester.
const out = await build({ entryPoints: [new URL("./draw.ts", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")], bundle: true, format: "esm", write: false, platform: "node" });
const { varied, spreadPairs } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);

const pool = (groups) => Object.entries(groups).flatMap(([g, n]) => Array.from({ length: n }, (_, i) => ({ id: `${g}-${i}`, group: g })));

test("varied : un gros groupe ne déborde pas tant que les autres ont des pistes", () => {
  const p = pool({ big: 118, a: 3, b: 3, c: 3, d: 3, e: 3, f: 3, g: 3, h: 3, i: 3, j: 3 });
  for (let k = 0; k < 50; k++) {
    const d = varied(p, 32);
    assert.equal(d.length, 32);
    assert.equal(new Set(d.map((x) => x.id)).size, 32);
    assert.ok(d.filter((x) => x.group === "big").length <= 3);
  }
});

test("varied : groupe unique ou pool trop petit", () => {
  assert.equal(varied(pool({ seul: 10 }), 8).length, 8);
  assert.equal(varied(pool({ a: 2, b: 1 }), 8).length, 3);
});

test("spreadPairs : pas de duel du premier tour entre deux pistes du même groupe quand c'est évitable", () => {
  const p = pool({ a: 8, b: 4, c: 4 });
  for (let k = 0; k < 200; k++) {
    const d = spreadPairs(varied(p, 16));
    assert.equal(new Set(d.map((x) => x.id)).size, 16);
    for (let i = 0; i < d.length; i += 2) assert.notEqual(d[i].group, d[i + 1].group, JSON.stringify(d.map((x) => x.group)));
  }
});

const outB = await build({ entryPoints: [new URL("./bracket.ts", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")], bundle: true, format: "esm", write: false, platform: "node" });
const { generateBracket, advance, currentMatch, champion } = await import(`data:text/javascript;base64,${Buffer.from(outB.outputFiles[0].text).toString("base64")}`);

test("format Tout : 407 pistes, exempts répartis, tout le monde joue, 406 duels", () => {
  const p = pool({ x: 407 });
  const rounds = generateBracket(p);
  assert.equal(rounds[0].size, 512);
  const r1 = rounds[0].matches;
  assert.equal(r1.filter((m) => m.left && m.right).length, 151);
  assert.equal(r1.filter((m) => !m.left && !m.right).length, 0, "aucun duel vide");
  assert.equal(rounds[1].matches.flatMap((m) => [m.left, m.right]).filter(Boolean).length, 105, "105 qualifiés d'office au 2e tour");
  let r = rounds, duels = 0;
  for (let cur = currentMatch(r); cur; cur = currentMatch(r)) {
    r = advance(r, cur.match.id, cur.match.left.id);
    duels++;
  }
  assert.equal(duels, 406);
  assert.ok(champion(r));
});
