// Tous >= 50 cents : Stripe refuse les paiements carte sous 0,50 €.
export const OPENING_BG_EURO_PRICE_CENTS = {
  Commun: 50,
  Rare: 60,
  Epique: 79,
  Legendaire: 99,
  Mythique: 109,
  Secret: 150,
  Interdit: 150,
}

const euroFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function openingBgPriceCents(bgOrRarity) {
  // Override prix par fond (euroCents) → permet un prix custom (ex : 1,49 €).
  if (bgOrRarity && typeof bgOrRarity === 'object' && bgOrRarity.euroCents > 0) return bgOrRarity.euroCents
  const rarity = typeof bgOrRarity === 'string' ? bgOrRarity : bgOrRarity?.rarity
  return OPENING_BG_EURO_PRICE_CENTS[rarity] ?? OPENING_BG_EURO_PRICE_CENTS.Commun
}

export function formatEuroCents(cents) {
  return `${euroFmt.format((Number(cents) || 0) / 100)} €`
}

export function openingBgPriceLabel(bgOrRarity) {
  return formatEuroCents(openingBgPriceCents(bgOrRarity))
}
