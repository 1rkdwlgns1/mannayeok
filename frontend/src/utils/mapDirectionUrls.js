export function createKakaoDirectionUrl(origin, station) {
  const start = createKakaoPoint(getRoutePointName(origin), origin.lat, origin.lng)
  const end = createKakaoPoint(getRoutePointName(station), station.lat, station.lng)

  return `https://map.kakao.com/link/by/traffic/${start}/${end}`
}

export function createNaverSearchUrl(origin, station) {
  const start = createNaverPoint(getRoutePointName(origin), origin.lat, origin.lng)
  const end = createNaverPoint(getRoutePointName(station), station.lat, station.lng)

  return `https://map.naver.com/p/directions/${start}/${end}/-/transit`
}

function createKakaoPoint(name, lat, lng) {
  return `${encodeURIComponent(name)},${lat},${lng}`
}

function createNaverPoint(name, lat, lng) {
  const normalizedName = normalizeRouteName(name)
  const mappedStationPoint = NAVER_STATION_ROUTE_POINTS[normalizedName]

  if (mappedStationPoint) {
    return mappedStationPoint
  }

  return `${lng},${lat},${encodeURIComponent(normalizedName)},PLACE_POI`
}

const NAVER_STATION_ROUTE_POINTS = {
  창동역: `3zkAxq,2APGJ7,${encodeURIComponent('창동역 1호선')},117,SUBWAY_STATION`,
}

function getRoutePointName(point) {
  const name = normalizeRouteName(point.routeName || point.name || point.address || '')

  if (name.includes('역') || !point.name) {
    return name
  }

  return `${name}역`
}

function normalizeRouteName(name) {
  return String(name || '')
    .replace(/\s+\d+호선/g, '')
    .trim()
}
