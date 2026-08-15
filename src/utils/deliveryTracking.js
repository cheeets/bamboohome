import { PINAMUNGAJAN_BARANGAYS } from '../context/AuthContext'

/**
 * Pinamungajan sits on Cebu's west coast — the Tañon Strait is WEST (lower lng).
 * All simulated delivery coords must stay inland / east of the highway.
 */
export const PINAMUNGAJAN_CENTER = [10.2712, 123.5958]

const hashString = (value = '') =>
  value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

/**
 * Fixed inland coordinates per barangay (approximate, east of coastal highway).
 * lng increases toward the interior; values below ~123.588 tend to fall in the sea.
 */
const BARANGAY_COORDINATES = {
  Poblacion: [10.2712, 123.5958],
  Mangoto: [10.2778, 123.6015],
  Pandacan: [10.2685, 123.6028],
  Lamac: [10.2845, 123.6082],
  Binabag: [10.2625, 123.5995],
  Anislag: [10.2885, 123.5968],
  Anopog: [10.2655, 123.6065],
  Buhingtubig: [10.2588, 123.5945],
  Busay: [10.2812, 123.5938],
  Butong: [10.2745, 123.6095],
  Cabiangon: [10.2698, 123.6125],
  Camugao: [10.2565, 123.6012],
  Duangan: [10.2915, 123.6045],
  Guimbawian: [10.2635, 123.6138],
  Lutod: [10.2865, 123.6115],
  'Lut-od': [10.2865, 123.6115],
  Opao: [10.2525, 123.5975],
  Punod: [10.2795, 123.6165],
  Rizal: [10.2675, 123.6185],
  Sacsac: [10.2935, 123.5985],
  Sambagon: [10.2615, 123.6195],
  Sibago: [10.2555, 123.6085],
  Tajao: [10.2485, 123.6025],
  Tangub: [10.2725, 123.6225],
  Tanibag: [10.2585, 123.6155],
  Tupas: [10.2855, 123.6195],
  Tutay: [10.2515, 123.6125],
}

/** Fallback: place unknown barangays on an inland grid (never west of the highway). */
const getInlandGridCoords = (barangayName) => {
  const index = PINAMUNGAJAN_BARANGAYS.indexOf(barangayName)
  const i = index >= 0 ? index : hashString(barangayName) % PINAMUNGAJAN_BARANGAYS.length
  const row = Math.floor(i / 5)
  const col = i % 5
  return [
    10.258 + row * 0.007,
    123.594 + col * 0.005,
  ]
}

export const getBarangayCoords = (barangayName) => {
  const key = barangayName?.trim()
  if (key && BARANGAY_COORDINATES[key]) {
    return BARANGAY_COORDINATES[key]
  }

  const caseMatch = Object.keys(BARANGAY_COORDINATES).find(
    (name) => name.toLowerCase() === key?.toLowerCase(),
  )
  if (caseMatch) return BARANGAY_COORDINATES[caseMatch]

  return getInlandGridCoords(key || 'Poblacion')
}

export const parseBarangayFromAddress = (addressLine = '') => {
  const match = addressLine.match(/Barangay\s+([^,]+)/i)
  if (match?.[1]) {
    const parsed = match[1].trim()
    if (PINAMUNGAJAN_BARANGAYS.includes(parsed)) return parsed
    const fuzzy = PINAMUNGAJAN_BARANGAYS.find(
      (name) => name.toLowerCase() === parsed.toLowerCase(),
    )
    if (fuzzy) return fuzzy
  }

  return (
    PINAMUNGAJAN_BARANGAYS.find((name) =>
      addressLine.toLowerCase().includes(name.toLowerCase()),
    ) || 'Poblacion'
  )
}

const coordsAreNear = (a, b, threshold = 0.0005) =>
  Math.abs(a[0] - b[0]) < threshold && Math.abs(a[1] - b[1]) < threshold

export const getDeliveryCoords = (order = {}) => {
  const addressLine = order.address?.addressLine || ''
  const buyerBarangay = parseBarangayFromAddress(addressLine)
  const buyerCoords = getBarangayCoords(buyerBarangay)

  const sellerBarangay = order.sellerBarangay || 'Poblacion'
  let storeCoords = getBarangayCoords(sellerBarangay)

  // Seller hub: slight north-east offset so pickup ≠ drop-off when same barangay.
  if (coordsAreNear(storeCoords, buyerCoords)) {
    storeCoords = [
      buyerCoords[0] + 0.0035,
      buyerCoords[1] + 0.0045,
    ]
  }

  // If seller barangay unknown, place store at poblacion hub (inland market area).
  if (!order.sellerBarangay) {
    const hubCoords = getBarangayCoords('Poblacion')
    storeCoords = coordsAreNear(hubCoords, buyerCoords)
      ? [buyerCoords[0] + 0.004, buyerCoords[1] + 0.005]
      : hubCoords
  }

  return {
    storeCoords,
    buyerCoords,
    buyerBarangay,
    sellerBarangay,
  }
}

export const buildRouteWaypoints = (originCoords, destCoords, count = 40) =>
  Array.from({ length: count + 1 }, (_, index) => {
    const ratio = index / count
    const curveOffset = Math.sin(ratio * Math.PI) * 0.0015
    return [
      originCoords[0] + (destCoords[0] - originCoords[0]) * ratio + curveOffset,
      originCoords[1] + (destCoords[1] - originCoords[1]) * ratio + curveOffset * 0.4,
    ]
  })

export const getRouteDistanceKm = (originCoords, destCoords) => {
  const [lat1, lng1] = originCoords
  const [lat2, lng2] = destCoords
  const toRad = (deg) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const distance = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.max(distance, 0.3)
}

export const DELIVERY_TIMELINE = [
  { key: 'pending', label: 'Order Placed', description: 'Waiting for seller confirmation' },
  { key: 'accepted', label: 'Order Accepted', description: 'Seller confirmed your order' },
  { key: 'processing', label: 'Preparing Package', description: 'Items are being packed' },
  { key: 'shipped', label: 'Out for Delivery', description: 'Courier is on the way to you' },
  { key: 'delivered', label: 'Delivered', description: 'Package received successfully' },
]

const STATUS_ORDER = ['pending', 'accepted', 'processing', 'shipped', 'delivered', 'completed']

export const normalizeDeliveryStatus = (status = '') => {
  const normalized = status.toString().toLowerCase()
  if (normalized === 'completed') return 'delivered'
  if (normalized === 'rejected') return 'cancelled'
  return normalized
}

export const getTimelineStepIndex = (status = '') => {
  const normalized = normalizeDeliveryStatus(status)
  if (normalized === 'cancelled') return -1
  const idx = STATUS_ORDER.indexOf(normalized)
  return idx >= 0 ? Math.min(idx, DELIVERY_TIMELINE.length - 1) : 0
}

export const getRouteProgressIndex = (status = '', waypointCount = 40) => {
  const normalized = normalizeDeliveryStatus(status)
  if (normalized === 'cancelled') return 0
  if (normalized === 'delivered') return waypointCount
  if (normalized === 'pending') return 0
  if (normalized === 'accepted') return Math.round(waypointCount * 0.08)
  if (normalized === 'processing') return Math.round(waypointCount * 0.2)
  if (normalized === 'shipped') return Math.round(waypointCount * 0.45)
  return Math.round(waypointCount * 0.3)
}

export const isActiveDelivery = (status = '') => {
  const normalized = normalizeDeliveryStatus(status)
  return ['accepted', 'processing', 'shipped'].includes(normalized)
}

export const isTrackableOrder = (status = '') => {
  const normalized = normalizeDeliveryStatus(status)
  return !['cancelled'].includes(normalized)
}

export const getDriverHeading = (currentCoords, nextCoords) => {
  const dy = nextCoords[0] - currentCoords[0]
  const dx = nextCoords[1] - currentCoords[1]
  return Math.round((Math.atan2(dx, dy) * 180) / Math.PI)
}
