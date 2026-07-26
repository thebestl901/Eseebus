import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'
import type { RouteStopPoint } from '../types/transport'
import 'leaflet/dist/leaflet.css'

interface RouteMapProps {
  stops?: RouteStopPoint[]
  selectedSeq?: number | null
  height?: number
  focusNonce?: number
  onStopSelect?: (seq: number) => void
}

function InvalidateOnResize({ height }: { height?: number }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map, height])
  return null
}

function FitBounds({ coordinates, enabled }: { coordinates: LatLngExpression[]; enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || coordinates.length === 0) return
    map.fitBounds(coordinates as [number, number][], { padding: [30, 30] })
  }, [map, coordinates, enabled])
  return null
}

function FocusStop({
  stop,
  mapHeight,
  focusNonce,
}: {
  stop: RouteStopPoint | null
  mapHeight?: number
  focusNonce?: number
}) {
  const map = useMap()
  useEffect(() => {
    if (!stop || stop.lat == null || stop.lng == null) return

    const timer = window.setTimeout(() => {
      map.invalidateSize()
      map.flyTo([stop.lat!, stop.lng!], 17, { duration: 0.45 })
    }, 120)

    return () => window.clearTimeout(timer)
  }, [map, stop?.seq, stop?.lat, stop?.lng, mapHeight, focusNonce])
  return null
}

function createStopIcon(seq: number, selected: boolean) {
  return L.divIcon({
    className: 'route-map-marker-wrap',
    html: `<span class="route-map-marker${selected ? ' route-map-marker--selected' : ''}">${seq}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export function RouteMap({ stops = [], selectedSeq, height, focusNonce, onStopSelect }: RouteMapProps) {
  const plottedStops = useMemo(
    () =>
      stops.filter(
        (stop) =>
          stop.lat != null &&
          stop.lng != null &&
          !Number.isNaN(stop.lat) &&
          !Number.isNaN(stop.lng),
      ),
    [stops],
  )

  const selectedStop = useMemo(
    () => plottedStops.find((stop) => stop.seq === selectedSeq) ?? null,
    [plottedStops, selectedSeq],
  )

  if (plottedStops.length === 0) {
    return (
      <div
        className="route-map route-map--empty"
        style={height != null ? { height } : undefined}
      >
        暫不支援
      </div>
    )
  }

  const center = [plottedStops[0]!.lat!, plottedStops[0]!.lng!] as LatLngExpression
  const boundsCoordinates = plottedStops.map(
    (stop) => [stop.lat!, stop.lng!] as LatLngExpression,
  )

  return (
    <div className="route-map" style={height != null ? { height } : undefined}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {plottedStops.map((stop) => (
          <Marker
            key={`${stop.seq}-${stop.stopId}`}
            position={[stop.lat!, stop.lng!]}
            icon={createStopIcon(stop.seq, selectedSeq === stop.seq)}
            zIndexOffset={selectedSeq === stop.seq ? 1000 : stop.seq}
            eventHandlers={{
              click: () => onStopSelect?.(stop.seq),
            }}
          />
        ))}
        <FitBounds enabled={selectedSeq == null} coordinates={boundsCoordinates} />
        <FocusStop stop={selectedStop} mapHeight={height} focusNonce={focusNonce} />
        <InvalidateOnResize height={height} />
      </MapContainer>
    </div>
  )
}
