export const OPENING_BG_EURO_PRICE_CENTS = {
  Commun: 29,
  Rare: 39,
  Epique: 69,
  Legendaire: 99,
  Mythique: 109,
  Secret: 150,
  Interdit: 150,
}

const euroFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function openingBgPriceCents(bgOrRarity) {
  const rarity = typeof bgOrRarity === 'string' ? bgOrRarity : bgOrRarity?.rarity
  return OPENING_BG_EURO_PRICE_CENTS[rarity] ?? OPENING_BG_EURO_PRICE_CENTS.Commun
}

export function formatEuroCents(cents) {
  return `${euroFmt.format((Number(cents) || 0) / 100)} €`
}

export function openingBgPriceLabel(bgOrRarity) {
  return formatEuroCents(openingBgPriceCents(bgOrRarity))
}
