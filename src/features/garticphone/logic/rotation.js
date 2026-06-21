// Freydiss Phone — rotation des carnets (logique PURE, testée unitairement).
// Sièges 0..n-1. Le carnet b (auteur = siège b) est au siège (b+r)%n au round r.
// Donc le siège s travaille le carnet (s-r+n)%n au round r.

export const bookForSeat = (seat, round, n) => (((seat - round) % n) + n) % n;
export const seatForBook = (book, round, n) => (book + round) % n;

// Type de page : 0 = texte, impair = dessin, pair (>=2) = texte.
export const pageType = (pageIndex) =>
  pageIndex === 0 ? 'text' : pageIndex % 2 === 1 ? 'drawing' : 'text';

// N pages par carnet = N rounds.
export const totalRounds = (n) => n;

// Assignations d'un round : pour chaque siège, le carnet qu'il touche + le type.
export function assignmentsForRound(n, round) {
  return Array.from({ length: n }, (_, seat) => ({
    seat,
    book: bookForSeat(seat, round, n),
    pageIndex: round,
    type: pageType(round),
  }));
}

// Ce que CE siège doit faire au round courant (null = partie finie).
export function seatTask(seat, round, n) {
  if (round < 0 || round >= n) return null;
  return { book: bookForSeat(seat, round, n), pageIndex: round, type: pageType(round) };
}

// Reveal : regroupe les pages plates en albums ordonnés par page_index,
// indexés par book_id (= siège auteur).
export function buildAlbums(pages, n) {
  const books = Array.from({ length: n }, (_, b) => ({ book: b, pages: [] }));
  for (const p of pages) {
    if (p.book_id >= 0 && p.book_id < n) books[p.book_id].pages.push(p);
  }
  for (const bk of books) bk.pages.sort((a, b) => a.page_index - b.page_index);
  return books;
}
