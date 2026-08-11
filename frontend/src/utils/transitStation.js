function isSameTransitStation(firstStationName, secondStationName) {
  const normalize = (stationName) =>
    String(stationName || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/역$/, '')

  const first = normalize(firstStationName)
  const second = normalize(secondStationName)
  return Boolean(first && second && first === second)
}

export { isSameTransitStation }
