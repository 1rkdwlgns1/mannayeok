import { useEffect, useRef } from 'react'
import { getRoadRoutePath, loadKakaoMapSdk } from '../services/kakaoApi'

const ORIGIN_COLORS = ['#5A45E8', '#00A84D', '#EAB308', '#8B5CF6']
const STATION_COLORS = ['#F97316', '#8B5CF6', '#06B6D4']

function KakaoMap({ origins, meetingPoint, meetingPoints = [] }) {
  const mapRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || !meetingPoint) return

    let map = null
    let overlays = []

    loadKakaoMapSdk()
      .then(async (kakao) => {
        map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(meetingPoint.lat, meetingPoint.lng),
          level: 6,
        })

        const bounds = new kakao.maps.LatLngBounds()
        const meetingPosition = new kakao.maps.LatLng(meetingPoint.lat, meetingPoint.lng)
        const routePaths = await Promise.all(
          origins.map((origin) => getRoadRoutePath(origin, meetingPoint).catch(() => null)),
        )

        if (!map) return

        origins.forEach((origin, index) => {
          const originPosition = new kakao.maps.LatLng(origin.lat, origin.lng)
          const color = ORIGIN_COLORS[index % ORIGIN_COLORS.length]
          const roadPath = routePaths[index]?.map((point) => new kakao.maps.LatLng(point.lat, point.lng))
          const path = roadPath?.length ? roadPath : [originPosition, meetingPosition]

          overlays.push(...drawRouteLine(kakao, map, path, color))

          const originOverlay = createLabelOverlay(kakao, originPosition, `출발 ${index + 1}`, color)
          originOverlay.setMap(map)
          overlays.push(originOverlay)
          bounds.extend(originPosition)
        })

        const visibleMeetingPoints = meetingPoints.length ? meetingPoints : [meetingPoint]

        visibleMeetingPoints.forEach((station, index) => {
          const stationPosition = new kakao.maps.LatLng(station.lat, station.lng)
          const isSelected = station.id === meetingPoint.id
          const color = isSelected ? '#F97316' : STATION_COLORS[index % STATION_COLORS.length]
          const label = station.mapLabel || `#${station.rank || index + 1}`

          const stationOverlay = createMarkerOverlay(kakao, stationPosition, {
            color,
            label,
            name: station.name,
            selected: isSelected,
          })

          stationOverlay.setMap(map)
          overlays.push(stationOverlay)
          bounds.extend(stationPosition)
        })

        map.setBounds(bounds)
      })
      .catch(() => null)

    return () => {
      overlays.forEach((overlay) => overlay.setMap(null))
      overlays = []
      if (map) {
        map = null
      }
    }
  }, [origins, meetingPoint, meetingPoints])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <div ref={mapRef} className="h-[300px] w-full md:h-[360px]" />
      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500">
        {origins.map((_, index) => (
          <LegendDot key={index} color={ORIGIN_COLORS[index % ORIGIN_COLORS.length]} label={`출발지 ${index + 1} 경로`} />
        ))}
        <LegendDot color="#F97316" label="선택한 후보" />
      </div>
    </div>
  )
}

function drawRouteLine(kakao, map, path, color) {
  const shadowLine = new kakao.maps.Polyline({
    map,
    path,
    strokeWeight: 7,
    strokeColor: '#0F172A',
    strokeOpacity: 0.28,
    strokeStyle: 'solid',
  })

  const routeLine = new kakao.maps.Polyline({
    map,
    path,
    strokeWeight: 4,
    strokeColor: color,
    strokeOpacity: 0.82,
    strokeStyle: 'solid',
  })

  return [shadowLine, routeLine]
}

function createLabelOverlay(kakao, position, label, color) {
  const content = `
    <div style="
      display: flex;
      align-items: center;
      gap: 4px;
      background: ${color};
      color: white;
      border-radius: 999px;
      padding: 4px 7px;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
      white-space: nowrap;
    ">
      <span style="
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: white;
        opacity: 0.9;
      "></span>
      ${label}
    </div>
  `

  const overlay = new kakao.maps.CustomOverlay({
    position,
    content,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 4,
  })

  overlay.setMap(null)
  return overlay
}

function createMarkerOverlay(kakao, position, { color, label, name, selected }) {
  const size = selected ? 34 : 24
  const content = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      font-family: inherit;
    ">
      <div style="
        min-width: ${size}px;
        height: ${size}px;
        border-radius: 999px;
        background: ${color};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${selected ? 11 : 10}px;
        font-weight: 900;
        border: 3px solid white;
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.2);
      ">
        ${label}
      </div>
      ${
        selected
          ? `<div style="
              background: white;
              border: 1px solid rgba(148, 163, 184, 0.35);
              border-radius: 999px;
              padding: 3px 8px;
              font-size: 11px;
              font-weight: 800;
              color: #0f172a;
              box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
            ">
              ${name}
            </div>`
          : ''
      }
    </div>
  `

  const overlay = new kakao.maps.CustomOverlay({
    position,
    content,
    xAnchor: 0.5,
    yAnchor: 0.55,
    zIndex: selected ? 8 : 5,
  })

  overlay.setMap(null)
  return overlay
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

export default KakaoMap
