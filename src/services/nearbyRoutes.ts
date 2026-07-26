import { getStopEta, getStops } from './kmbApi'
import { getNlbRoutes, getNlbRouteStopPoints, parseNlbDestination } from './nlbApi'
import { loadMtrBusCatalog } from './mtrBusCatalog'
import { mergeSearchResults, routeDetailPath } from './transportSearch'
import { stopNamesMatch } from '../utils/helpers'
import {
  OPERATOR_LABELS,
  type RouteSearchItem,
  type TransportOperator,
} from '../types/transport'

export interface NearbyRouteHit {
  item: RouteSearchItem
  stopId: string
}

export interface NearbyRoutesQuery {
  nameTc: string
  operator: TransportOperator
  route: string
  direction: string
  serviceType?: string
  mtrLineRef?: string
  mtrReferenceId?: string
  routeId?: number
}

function isSameRoute(item: RouteSearchItem, query: NearbyRoutesQuery): boolean {
  if (item.operator !== query.operator) return false
  if (item.route !== query.route) return false

  switch (item.operator) {
    case 'KMB':
      return item.direction === query.direction && (item.serviceType ?? '1') === (query.serviceType ?? '1')
    case 'CTB':
      return item.direction === query.direction
    case 'NLB':
      return String(item.routeId) === query.direction
    case 'GMB':
      return item.direction === query.direction && item.routeId === query.routeId
    case 'MTR':
      return (
        item.direction === query.direction &&
        item.mtrLineRef === query.mtrLineRef &&
        item.mtrReferenceId === query.mtrReferenceId
      )
    default:
      return false
  }
}

function hitKey(hit: NearbyRouteHit): string {
  const { item } = hit
  if (item.operator === 'GMB') return `${item.operator}-${item.routeId}-${item.routeSeq}`
  if (item.operator === 'NLB') return `${item.operator}-${item.routeId}`
  if (item.operator === 'MTR') {
    return `${item.operator}-${item.route}-${item.mtrLineRef}-${item.mtrReferenceId}`
  }
  return `${item.operator}-${item.route}-${item.direction}-${item.serviceType ?? '1'}`
}

function addHit(
  hits: NearbyRouteHit[],
  seen: Set<string>,
  item: RouteSearchItem,
  stopId: string,
  query: NearbyRoutesQuery,
) {
  if (isSameRoute(item, query)) return
  const hit = { item, stopId }
  const key = hitKey(hit)
  if (seen.has(key)) return
  seen.add(key)
  hits.push(hit)
}

async function findKmbNearbyRoutes(query: NearbyRoutesQuery): Promise<NearbyRouteHit[]> {
  const stops = await getStops()
  const matchingStopIds = [
    ...new Set(
      stops.filter((stop) => stopNamesMatch(stop.name_tc, query.nameTc)).map((stop) => stop.stop),
    ),
  ]

  const hits: NearbyRouteHit[] = []
  const seen = new Set<string>()

  await Promise.all(
    matchingStopIds.map(async (stopId) => {
      const etas = await getStopEta(stopId)
      for (const eta of etas) {
        addHit(
          hits,
          seen,
          {
            operator: 'KMB',
            operatorLabel: OPERATOR_LABELS.KMB,
            route: eta.route,
            direction: eta.dir,
            serviceType: String(eta.service_type),
            destTc: eta.dest_tc,
            destSc: eta.dest_sc,
            destEn: eta.dest_en,
          },
          stopId,
          query,
        )
      }
    }),
  )

  return hits
}

async function findMtrNearbyRoutes(query: NearbyRoutesQuery): Promise<NearbyRouteHit[]> {
  const catalog = await loadMtrBusCatalog()
  const hits: NearbyRouteHit[] = []
  const seen = new Set<string>()

  for (const stop of catalog.stops) {
    if (!stopNamesMatch(stop.nameTc, query.nameTc)) continue
    const item = catalog.searchItems.find(
      (entry) =>
        entry.route === stop.routeId &&
        entry.direction === stop.direction &&
        entry.mtrReferenceId === stop.referenceId,
    )
    if (!item) continue
    addHit(hits, seen, item, stop.stopId, query)
  }

  return hits
}

async function findNlbNearbyRoutes(query: NearbyRoutesQuery): Promise<NearbyRouteHit[]> {
  const routes = await getNlbRoutes()
  const hits: NearbyRouteHit[] = []
  const seen = new Set<string>()

  await Promise.all(
    routes.map(async (route) => {
      const routeId = Number(route.routeId)
      const points = await getNlbRouteStopPoints(routeId)
      const match = points.find((point) => stopNamesMatch(point.nameTc, query.nameTc))
      if (!match) return
      const dest = parseNlbDestination(route)
      addHit(
        hits,
        seen,
        {
          operator: 'NLB',
          operatorLabel: OPERATOR_LABELS.NLB,
          route: route.routeNo,
          direction: route.routeId,
          routeId,
          destTc: dest.destTc,
          destSc: dest.destSc,
          destEn: dest.destEn,
        },
        match.stopId,
        query,
      )
    }),
  )

  return hits
}

export async function findNearbyRoutes(query: NearbyRoutesQuery): Promise<NearbyRouteHit[]> {
  const [kmb, mtr, nlb] = await Promise.all([
    findKmbNearbyRoutes(query),
    findMtrNearbyRoutes(query),
    findNlbNearbyRoutes(query),
  ])

  const sorted = mergeSearchResults(
    kmb.map((hit) => hit.item),
    [],
    nlb.map((hit) => hit.item),
    mtr.map((hit) => hit.item),
    [],
  )

  const hitByKey = new Map<string, NearbyRouteHit>()
  for (const hit of [...kmb, ...mtr, ...nlb]) {
    hitByKey.set(hitKey(hit), hit)
  }

  return sorted
    .map((item) => hitByKey.get(hitKey({ item, stopId: '' })))
    .filter((hit): hit is NearbyRouteHit => hit != null)
}

export function nearbyRoutePath(hit: NearbyRouteHit): string {
  const base = routeDetailPath(hit.item)
  return `${base}&stop=${encodeURIComponent(hit.stopId)}`
}
