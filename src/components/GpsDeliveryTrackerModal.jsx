import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  X, Navigation, Phone, ShieldCheck, MapPin, Truck, Store, User,
  Clock, CheckCircle2, AlertCircle, Package, CircleDot,
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { formatPrice } from '../utils/rating'
import {
  buildRouteWaypoints,
  DELIVERY_TIMELINE,
  getDeliveryCoords,
  getDriverHeading,
  getRouteDistanceKm,
  getRouteProgressIndex,
  getTimelineStepIndex,
  isActiveDelivery,
  normalizeDeliveryStatus,
} from '../utils/deliveryTracking'
import 'leaflet/dist/leaflet.css'
import '../css/GpsDeliveryTracker.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const storeIcon = new L.DivIcon({
  className: 'gps-marker-store',
  html: `<div class="marker-pin store-pin"><div class="pin-inner">🏪</div></div><div class="marker-pulse"></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

const buyerIcon = new L.DivIcon({
  className: 'gps-marker-buyer',
  html: `<div class="marker-pin buyer-pin"><div class="pin-inner">🏠</div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

const createTruckIcon = (heading = 0) =>
  new L.DivIcon({
    className: 'gps-marker-truck',
    html: `<div class="marker-pin truck-pin" style="transform: rotate(${heading}deg);">
            <div class="pin-inner">🚚</div>
           </div>
           <div class="truck-radar-ring"></div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  })

function MapResizeFix() {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 120)
    return () => clearTimeout(timer)
  }, [map])
  return null
}

function MapRecenter({ center, enabled }) {
  const map = useMap()
  useEffect(() => {
    if (enabled && center?.length === 2) {
      map.panTo(center, { animate: true, duration: 1 })
    }
  }, [center, enabled, map])
  return null
}

function MapFitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points?.length) return
    map.fitBounds(points, { padding: [48, 48], maxZoom: 14 })
  // Fit once when the map mounts; route endpoints stay fixed for an order.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

export default function GpsDeliveryTrackerModal({ order, onClose }) {
  const [sellerMeta, setSellerMeta] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [autoFollow, setAutoFollow] = useState(true)
  const [speed, setSpeed] = useState(28)
  const [callToast, setCallToast] = useState(false)

  const rawStatus = normalizeDeliveryStatus(order?.status)
  const orderItems = order?.products || order?.items || []
  const buyerName = order?.address?.fullName || order?.buyerName || order?.userEmail?.split('@')[0] || 'Valued Buyer'
  const deliveryAddress = order?.address?.addressLine || 'Barangay Poblacion, Pinamungajan, Cebu'
  const phone = order?.address?.phoneNumber || 'Not provided'
  const storeName = sellerMeta?.storeName || order?.storeName || 'Bamboo Home Partner'

  useEffect(() => {
    if (!order?.sellerId) return undefined

    let cancelled = false
    const loadSeller = async () => {
      try {
        const sellerSnap = await getDoc(doc(db, 'users', order.sellerId))
        if (!cancelled && sellerSnap.exists()) {
          setSellerMeta(sellerSnap.data())
        }
      } catch (err) {
        console.error('Failed to load seller for GPS tracker:', err)
      }
    }

    loadSeller()
    return () => { cancelled = true }
  }, [order?.sellerId])

  const routeData = useMemo(() => {
    const enrichedOrder = {
      ...order,
      sellerBarangay: sellerMeta?.barangay,
      storeName: sellerMeta?.storeName || order?.storeName,
    }
    const { storeCoords, buyerCoords, buyerBarangay, sellerBarangay } = getDeliveryCoords(enrichedOrder)
    const waypoints = buildRouteWaypoints(storeCoords, buyerCoords)
    const distanceKm = getRouteDistanceKm(storeCoords, buyerCoords)
    return { storeCoords, buyerCoords, waypoints, distanceKm, buyerBarangay, sellerBarangay }
  }, [order, sellerMeta])

  const { storeCoords, buyerCoords, waypoints, distanceKm, buyerBarangay, sellerBarangay } = routeData
  const WAYPOINT_COUNT = waypoints.length - 1

  useEffect(() => {
    setCurrentStep(getRouteProgressIndex(order?.status, WAYPOINT_COUNT))
  }, [order?.status, WAYPOINT_COUNT])

  useEffect(() => {
    if (!isActiveDelivery(rawStatus)) return undefined

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const maxStep = rawStatus === 'shipped'
          ? WAYPOINT_COUNT
          : rawStatus === 'processing'
            ? Math.round(WAYPOINT_COUNT * 0.35)
            : Math.round(WAYPOINT_COUNT * 0.15)
        if (prev >= maxStep) return prev
        return prev + 1
      })
      setSpeed(Math.floor(24 + Math.random() * 14))
    }, 2800)

    return () => clearInterval(interval)
  }, [rawStatus, WAYPOINT_COUNT])

  const currentCoords = waypoints[currentStep] || waypoints[0]
  const nextCoords = waypoints[Math.min(currentStep + 1, WAYPOINT_COUNT)] || currentCoords
  const headingAngle = getDriverHeading(currentCoords, nextCoords)
  const truckIcon = useMemo(() => createTruckIcon(headingAngle), [headingAngle])

  const progressPercent = Math.round((currentStep / WAYPOINT_COUNT) * 100)
  const remainingWaypoints = WAYPOINT_COUNT - currentStep
  const remainingDistanceKm = Math.max(0, (remainingWaypoints / WAYPOINT_COUNT) * distanceKm)
  const remainingMinutes = Math.max(1, Math.ceil((remainingDistanceKm / Math.max(speed, 1)) * 60))

  const timelineIndex = getTimelineStepIndex(order?.status)
  const isDelivered = rawStatus === 'delivered'
  const isCancelled = rawStatus === 'cancelled'
  const showCourier = isActiveDelivery(rawStatus) || isDelivered

  const handleCallDriver = useCallback(() => {
    setCallToast(true)
    setTimeout(() => setCallToast(false), 4000)
  }, [])

  if (!order) return null

  return (
    <div className="gps-modal-overlay" onClick={onClose}>
      <div className="gps-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="gps-modal-header">
          <div className="gps-header-info">
            <div className="gps-live-badge">
              <span className="live-dot"></span>
              {isActiveDelivery(rawStatus) ? 'LIVE DELIVERY TRACKING' : 'DELIVERY TRACKER'}
            </div>
            <h2>Order #{order.id.slice(0, 8).toUpperCase()}</h2>
            <p className="gps-header-sub">
              Store: <strong>{storeName}</strong> • Recipient: <strong>{buyerName}</strong>
            </p>
          </div>
          <button className="gps-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {callToast && (
          <div className="gps-driver-call-alert">
            <Phone size={16} /> Connecting you to courier (0917-888-2491)...
          </div>
        )}

        <div className="gps-modal-body">
          <div className="gps-map-panel">
            <MapContainer
              center={currentCoords}
              zoom={14}
              scrollWheelZoom
              className="leaflet-map-canvas"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapResizeFix />
              <MapFitBounds points={[storeCoords, buyerCoords]} />
              {autoFollow && isActiveDelivery(rawStatus) && (
                <MapRecenter center={currentCoords} enabled={autoFollow} />
              )}

              <Polyline
                positions={waypoints}
                color="#94a3b8"
                weight={4}
                opacity={0.55}
                dashArray="8, 10"
              />

              <Polyline
                positions={waypoints.slice(0, currentStep + 1)}
                color="#16a34a"
                weight={6}
                opacity={1}
              />

              <Marker position={storeCoords} icon={storeIcon}>
                <Popup className="gps-popup">
                  <strong>Pickup: Seller Store</strong>
                  <div>{storeName}</div>
                  <div>Barangay {sellerBarangay}, Pinamungajan</div>
                </Popup>
              </Marker>

              <Marker position={buyerCoords} icon={buyerIcon}>
                <Popup className="gps-popup">
                  <strong>Delivery Address</strong>
                  <div>{deliveryAddress}</div>
                  <div>Recipient: {buyerName}</div>
                </Popup>
              </Marker>

              {showCourier && !isCancelled && (
                <Marker position={isDelivered ? buyerCoords : currentCoords} icon={truckIcon}>
                  <Popup className="gps-popup" autoPan={false}>
                    <strong>Bamboo Home Courier</strong>
                    <div>Driver: Mang Juan</div>
                    {!isDelivered && (
                      <>
                        <div>Speed: {speed} km/h</div>
                        <div>{remainingDistanceKm.toFixed(1)} km remaining</div>
                      </>
                    )}
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            <div className="gps-map-overlay-card">
              <div className="telemetry-badge">
                <Truck size={16} />
                <span>
                  {isDelivered ? 'Delivered' : isCancelled ? 'Stopped' : `${speed} km/h`}
                </span>
              </div>
              <div className="telemetry-badge">
                <Clock size={16} />
                <span>
                  {isDelivered ? 'Completed' : isCancelled ? 'Cancelled' : `${remainingMinutes} min ETA`}
                </span>
              </div>
              <button
                type="button"
                className={`telemetry-recenter-btn ${autoFollow ? 'active' : ''}`}
                onClick={() => setAutoFollow((prev) => !prev)}
                title="Toggle auto-follow courier"
              >
                <Navigation size={16} />
                <span>{autoFollow ? 'Following' : 'Center'}</span>
              </button>
            </div>
          </div>

          <div className="gps-sidebar-panel">
            <div className="gps-status-card">
              <div className="status-badge-row">
                <span className={`gps-status-pill status-${rawStatus}`}>
                  {(order.status || 'Pending').replace(/_/g, ' ')}
                </span>
                <span className="gps-progress-text">{progressPercent}% en route</span>
              </div>

              <div className="gps-progress-bar-bg">
                <div
                  className="gps-progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {isCancelled ? (
                <div className="gps-alert-box alert-cancelled">
                  <AlertCircle size={18} />
                  <div>
                    <strong>Order cancelled</strong>
                    <p>Live tracking is no longer available for this order.</p>
                  </div>
                </div>
              ) : isDelivered ? (
                <div className="gps-alert-box alert-success">
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>Package delivered</strong>
                    <p>Your order has arrived at {buyerBarangay}.</p>
                  </div>
                </div>
              ) : (
                <div className="gps-eta-banner">
                  <div className="eta-main">
                    <span className="eta-time">{remainingMinutes}</span>
                    <span className="eta-unit">MIN</span>
                  </div>
                  <div className="eta-details">
                    <p>Estimated arrival</p>
                    <strong>{remainingDistanceKm.toFixed(1)} km • {distanceKm.toFixed(1)} km total</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="gps-timeline-card">
              <div className="card-section-title">
                <Package size={16} /> Delivery Progress
              </div>
              <ol className="gps-delivery-timeline">
                {DELIVERY_TIMELINE.map((step, index) => {
                  const isComplete = isDelivered || timelineIndex > index
                  const isCurrent = !isDelivered && !isCancelled && timelineIndex === index
                  return (
                    <li
                      key={step.key}
                      className={`gps-timeline-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                      <span className="gps-timeline-dot">
                        {isComplete ? <CheckCircle2 size={14} /> : isCurrent ? <CircleDot size={14} /> : index + 1}
                      </span>
                      <div className="gps-timeline-content">
                        <strong>{step.label}</strong>
                        <p>{step.description}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>

            {showCourier && !isCancelled && (
              <div className="gps-courier-card">
                <div className="courier-avatar">
                  <User size={24} />
                </div>
                <div className="courier-info">
                  <h4>Mang Juan</h4>
                  <p>{storeName} Express • Plate GB-8829</p>
                  <div className="courier-rating">
                    <ShieldCheck size={14} color="#16a34a" /> Verified Bamboo Home courier
                  </div>
                </div>
                <button type="button" className="gps-call-btn" onClick={handleCallDriver} title="Call courier">
                  <Phone size={18} />
                </button>
              </div>
            )}

            <div className="gps-address-card">
              <div className="card-section-title">
                <MapPin size={16} /> Delivery Address
              </div>
              <p className="address-name">{buyerName}</p>
              <p className="address-phone">Phone: {phone}</p>
              <p className="address-line">{deliveryAddress}</p>
            </div>

            <div className="gps-items-card">
              <div className="card-section-title">
                <Store size={16} /> Order Items ({orderItems.length})
              </div>
              <div className="gps-items-list">
                {orderItems.map((item, index) => (
                  <div key={index} className="gps-item-row">
                    <span className="item-qty">{item.quantity || 1}x</span>
                    <span className="item-name">{item.name || 'Bamboo Item'}</span>
                    <span className="item-price">
                      {formatPrice((item.price || 0) * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="gps-total-row">
                <span>Total amount</span>
                <strong>{formatPrice(order.totalAmount || 0)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
