import RegionFilter from './RegionFilter.jsx'
import { QUALITY_PRESETS } from '../../data/worldMap.js'

export default function WorldMapHUD({
  activeRegion,
  onChangeRegion,
  qualityMode,
  onChangeQuality,
  selectedIsland,
  islandCount,
}) {
  const modes = Object.keys(QUALITY_PRESETS)

  return (
    <>
      <RegionFilter activeRegion={activeRegion} onChangeRegion={onChangeRegion} />
      <div className="world-map-controls">
        <span>{selectedIsland ? selectedIsland.name : `${islandCount} zones visibles`}</span>
        {modes.map((mode) => (
          <button key={mode} type="button" className={qualityMode === mode ? 'active' : ''} onClick={() => onChangeQuality(mode)}>
            {QUALITY_PRESETS[mode].label}
          </button>
        ))}
      </div>
    </>
  )
}
