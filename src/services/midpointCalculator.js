const EARTH_RADIUS_M = 6371000

export function calculateMidpoint(coordinates) {
  if (!coordinates.length) return null

  const sum = coordinates.reduce(
    (acc, current) => ({
      lat: acc.lat + current.lat,
      lng: acc.lng + current.lng,
    }),
    { lat: 0, lng: 0 },
  )

  return {
    lat: sum.lat / coordinates.length,
    lng: sum.lng / coordinates.length,
  }
}

export function calculateDistanceInMeters(from, to) {
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(EARTH_RADIUS_M * c)
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}
