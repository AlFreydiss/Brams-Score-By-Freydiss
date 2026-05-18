import { QUALITY_PRESETS } from '../../data/worldMap.js'

export function getQualityPreset(mode) {
  return QUALITY_PRESETS[mode] || QUALITY_PRESETS.balanced
}

export function nextQualityMode(current) {
  const modes = Object.keys(QUALITY_PRESETS)
  const index = modes.indexOf(current)
  return modes[(index + 1) % modes.length] || 'balanced'
}
