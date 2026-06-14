import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bookForSeat, seatForBook, pageType, seatTask, buildAlbums,
} from './rotation.js';

test('invariants N=1..12 : chaque joueur touche chaque carnet 1x, jamais le sien apres round 0', () => {
  for (let n = 1; n <= 12; n++) {
    const touched = Array.from({ length: n }, () => new Set());
    for (let r = 0; r < n; r++) {
      const seen = new Set();
      for (let s = 0; s < n; s++) {
        const b = bookForSeat(s, r, n);
        touched[s].add(b);
        seen.add(b);
        if (r > 0) assert.notEqual(b, s, `N=${n} r=${r} s=${s}: dessine son propre carnet`);
      }
      assert.equal(seen.size, n, `N=${n} r=${r}: collision de carnets`);
    }
    touched.forEach((set, s) =>
      assert.equal(set.size, n, `N=${n} siege ${s}: n'a pas touche tous les carnets`));
  }
});

test('carnet b ecrit par le siege b au round 0', () => {
  for (let n = 1; n <= 12; n++)
    for (let b = 0; b < n; b++) assert.equal(seatForBook(b, 0, n), b);
});

test('pageType : 0 texte, impair dessin, pair>=2 texte', () => {
  assert.equal(pageType(0), 'text');
  assert.equal(pageType(1), 'drawing');
  assert.equal(pageType(2), 'text');
  assert.equal(pageType(3), 'drawing');
  assert.equal(pageType(4), 'text');
});

test('N=1 solo : une tache puis fini', () => {
  assert.deepEqual(seatTask(0, 0, 1), { book: 0, pageIndex: 0, type: 'text' });
  assert.equal(seatTask(0, 1, 1), null);
});

test('seatTask round hors bornes = null', () => {
  assert.equal(seatTask(0, 4, 4), null);
  assert.equal(seatTask(2, -1, 4), null);
});

test('buildAlbums regroupe et ordonne par page_index', () => {
  const pages = [
    { book_id: 0, page_index: 1 },
    { book_id: 0, page_index: 0 },
    { book_id: 1, page_index: 0 },
  ];
  const a = buildAlbums(pages, 2);
  assert.deepEqual(a[0].pages.map((p) => p.page_index), [0, 1]);
  assert.deepEqual(a[1].pages.map((p) => p.page_index), [0]);
});
