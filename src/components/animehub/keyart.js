// ── Keyarts paysage (R2 anime/keyart) ────────────────────────────────────────
// Les originaux pèsent de 0,4 à 7 Mo (Violet Evergarden : 5120 px, 7 Mo) et le
// hub en chargeait huit d'un coup, plus un par carte paysage : ~20 Mo avant le
// premier scroll, hero noir plusieurs secondes sur mobile. Des variantes WebP
// 960 / 1920 / 2560 vivent sous anime/keyart/opt/<id>-<w>.webp ; l'original
// reste en place pour qui voudrait les régénérer.
//
// Seuls ces ids ont un keyart. Les autres cartes demandaient anime/keyart/<id>.jpg,
// prenaient un 404 puis retombaient sur l'affiche : on saute la requête.
const R2 = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/keyart'

export const KEYART_IDS = new Set(['onepiece', 'kaguya', 'kaiju-no-8', 'bleach', 'violet-evergarden', 'aot', 'jjk', 'reze'])

export const hasKeyart = id => KEYART_IDS.has(id)

export const keyartSrc = (id, w = 1920) => `${R2}/opt/${id}-${w}.webp`

export const keyartSrcSet = id => [960, 1920, 2560].map(w => `${keyartSrc(id, w)} ${w}w`).join(', ')

// Couvertures officielles des mangas (AniList, 460 px, WebP), sous manga/covers.
export const mangaCover = slug => `https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/manga/covers/${slug}.webp`
