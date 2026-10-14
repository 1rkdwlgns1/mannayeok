import { getStationLines } from '../data/subwayStationLines'
import { normalizeStationName } from '../services/transitApi'

const TEMPORARILY_UNAVAILABLE_ORIGIN_STATIONS = []

export function getTemporaryOriginRestriction(origin) {
  if (!origin) return null

  const stationNames = []
  if (origin.nearbyStationName) stationNames.push(origin.nearbyStationName)

  const directStationName = origin.routeName || origin.address || ''
  if (directStationName && getStationLines(directStationName).length > 0) {
    stationNames.push(directStationName)
  }

  const normalizedStationNames = stationNames.map(normalizeStationName)
  return (
    TEMPORARILY_UNAVAILABLE_ORIGIN_STATIONS.find((restriction) =>
      normalizedStationNames.includes(restriction.stationName),
    ) || null
  )
}

