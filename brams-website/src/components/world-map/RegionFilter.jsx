import { WORLD_REGIONS } from '../../data/worldMap.js'

export default function RegionFilter({ activeRegion, onChangeRegion }) {
  return (
    <div className="world-map-region-filter">
      <button type="button" className={activeRegion === 'All' ? 'active' : ''} onClick={() => onChangeRegion('All')}>
        Monde
      </button>
      {WORLD_REGIONS.map((region) => (
        <button key={region} type="button" className={activeRegion === region ? 'active' : ''} onClick={() => onChangeRegion(region)}>
          {region}
        </button>
      ))}
    </div>
  )
}
