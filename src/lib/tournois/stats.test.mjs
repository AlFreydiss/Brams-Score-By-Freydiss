import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

// stats.ts est en TypeScript : compilé à la volée (comme draw.test.mjs).
const out = await build({ entryPoints: [new URL("./stats.ts", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")], bundle: true, format: "esm", write: false, platform: "node", logLevel: "silent" });
const { sortRows } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);

const row = (id, wins, losses, rate = null) => ({ p: { id, title: id, group: "g" }, wins, losses, duels: wins + losses, rate, status: { kind: "none" } });

test("tri par % : sans pourcentage (peu de duels), les victoires passent avant les défaites", () => {
  const rows = [row("perdant", 0, 1), row("gagnant", 1, 0), row("deux", 2, 0), row("nul", 1, 1)];
  assert.deepEqual(sortRows(rows, "rate").map((r) => r.p.id), ["deux", "gagnant", "nul", "perdant"]);
});

test("tri par % : le pourcentage reste le premier critère", () => {
  const rows = [row("a", 3, 3, 50), row("b", 4, 1, 80), row("c", 9, 0)];
  assert.deepEqual(sortRows(rows, "rate").map((r) => r.p.id), ["b", "a", "c"]);
});
