import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, query, where, doc, updateDoc, onSnapshot, getDocs, documentId } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { Toast } from '../components/Toast'
import UserSidebar from '../components/UserSidebar'
import GpsDeliveryTrackerModal from '../components/GpsDeliveryTrackerModal'
import { GcashDemoModal } from '../components/GcashDemoModal'
import { formatPrice } from '../utils/rating'
import { Navigation, MapPin, CreditCard } from 'lucide-react'
import '../css/Orders.css'
import '../css/AdminDashboardLayout.css'
import '../css/GcashDemoModal.css'

export function Orders() {
  const { user, userRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingOrderId, setCancellingOrderId] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [activeView, setActiveView] = useState('orders')
  const [productStatusMap, setProductStatusMap] = useState({})

  // GPS Tracker State
  const [showGpsModal, setShowGpsModal] = useState(false)
  const [selectedGpsOrder, setSelectedGpsOrder] = useState(null)
  const [filterTab, setFilterTab] = useState('all')

  // GCash Pay Now State
  const [showGcashPayModal, setShowGcashPayModal] = useState(false)
  const [selectedGcashPayOrder, setSelectedGcashPayOrder] = useState(null)

  const normalizeStatus = (s) => (s || '').toString().toLowerCase()

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    // Real-time listener for orders
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = []
      const changes = snapshot.docChanges()

      snapshot.forEach((doc) => {
        ordersList.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      // Sort by date descending
      ordersList.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)))
      setOrders(ordersList)
      setLoading(false)

      // Show notifications for status changes
      changes.forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data()
          const status = normalizeStatus(data.status)

          if (status === 'accepted') {
            setToastMessage('🎉 Your order has been accepted by the seller!')
            setToastType('success')
          } else if (status === 'processing') {
            setToastMessage('⚙️ Your order is now being processed.')
            setToastType('success')
          } else if (status === 'shipped' || status === 'delivered') {
            setToastMessage('📦 Your order is ready for delivery!')
            setToastType('success')
          } else if (status === 'rejected') {
            setToastMessage('❌ Your order has been rejected by the seller.')
            setToastType('error')
          }
        }
      })
    }, (err) => {
      console.error('Error listening to orders:', err)
      setError('Failed to load orders')
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, navigate])

  useEffect(() => {
    const loadProductStatuses = async () => {
      const productIds = Array.from(
        new Set(
          orders
            .flatMap((order) => (order.products || order.items || []).map((item) => item.productId).filter(Boolean)),
        ),
      )

      if (productIds.length === 0) {
        setProductStatusMap({})
        return
      }

      try {
        const statusMap = {}
        const chunkSize = 10
        for (let i = 0; i < productIds.length; i += chunkSize) {
          const chunk = productIds.slice(i, i + chunkSize)
          const productQuery = query(collection(db, 'products'), where(documentId(), 'in', chunk))
          const snapshot = await getDocs(productQuery)
          snapshot.forEach((docSnap) => {
            statusMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() }
          })
        }

        productIds.forEach((productId) => {
          if (!statusMap[productId]) {
            statusMap[productId] = { missing: true }
          }
        })

        setProductStatusMap(statusMap)
      } catch (err) {
        console.error('Error loading product statuses for orders:', err)
      }
    }

    loadProductStatuses()
  }, [orders])

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate?.() || new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleCancelClick = (orderId) => {
    setCancellingOrderId(orderId)
    setShowCancelModal(true)
    setCancelError('')
  }

  const handleConfirmCancel = async () => {
    if (!cancellingOrderId) return

    try {
      const orderRef = doc(db, 'orders', cancellingOrderId)
      await updateDoc(orderRef, {
        status: 'Cancelled',
      })

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === cancellingOrderId ? { ...order, status: 'Cancelled' } : order,
        ),
      )

      setToastMessage('Order cancelled successfully')
      setToastType('success')
      setShowCancelModal(false)
      setCancellingOrderId(null)
    } catch (err) {
      console.error('Error cancelling order:', err)
      setCancelError('Failed to cancel order. Please try again.')
    }
  }

  const handleCloseCancelModal = () => {
    setShowCancelModal(false)
    setCancellingOrderId(null)
    setCancelError('')
  }

  const isItemUnavailable = (item) => {
    if (!item?.productId) return false
    const status = productStatusMap[item.productId]
    return !!status && (status.missing || status.deleted || status.permanentlyDeleted)
  }

  const orderHasUnavailableItems = (order) => {
    return (order.products || order.items || []).some(isItemUnavailable)
  }

  const getOrderStatusLabel = (order) => {
    const normalized = normalizeStatus(order.status)
    if (orderHasUnavailableItems(order) && !['cancelled', 'delivered', 'completed', 'rejected'].includes(normalized)) {
      return 'Unavailable'
    }
    return order.status
  }

  const getOrderStatusClass = (order) => {
    const normalized = normalizeStatus(order.status)
    if (orderHasUnavailableItems(order) && !['cancelled', 'delivered', 'completed', 'rejected'].includes(normalized)) {
      return 'status-unavailable'
    }
    return `status-${normalized}`
  }

  const handleViewDetails = (order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedOrder(null)
  }

  const handleOpenGpsModal = (order) => {
    setSelectedGpsOrder(order)
    setShowGpsModal(true)
  }

  const handleCloseGpsModal = () => {
    setShowGpsModal(false)
    setSelectedGpsOrder(null)
  }

  const handleOpenGcashPayModal = (order) => {
    setSelectedGcashPayOrder(order)
    setShowGcashPayModal(true)
  }

  const handleGcashPaymentComplete = async (simulatedRef) => {
    if (!selectedGcashPayOrder) return
    try {
      const orderRef = doc(db, 'orders', selectedGcashPayOrder.id)
      await updateDoc(orderRef, {
        paymentMethod: 'GCash Express',
        paymentStatus: 'Paid Online (GCash)',
        paymentDetails: {
          gateway: 'GCash Express Gateway',
          referenceNumber: simulatedRef,
          paidAt: new Date().toISOString(),
          isDemo: true,
        },
        updatedAt: new Date(),
      })

      setToastMessage('🎉 GCash online payment completed successfully!')
      setToastType('success')
    } catch (err) {
      console.error('Error updating order payment:', err)
      setToastMessage('Failed to update GCash payment status.')
      setToastType('error')
    } finally {
      setShowGcashPayModal(false)
      setSelectedGcashPayOrder(null)
    }
  }

  // Filter orders by tab
  const filteredOrdersList = orders.filter((order) => {
    const s = normalizeStatus(order.status)
    if (filterTab === 'in-transit') {
      return s === 'pending' || s === 'accepted' || s === 'processing' || s === 'shipped'
    } else if (filterTab === 'delivered') {
      return s === 'delivered' || s === 'completed'
    } else if (filterTab === 'cancelled') {
      return s === 'cancelled' || s === 'rejected'
    }
    return true
  })

  return (
    <div className="admin-dashboard-layout">
      <div className="dashboard-shell-inner">
        <UserSidebar activeView={activeView} setActiveView={setActiveView} />

        <main className="admin-main-content">
          <div className="admin-page-header">
            <div className="header-content">
              <h1>My Orders</h1>
              <p className="header-subtitle">Track and manage your bamboo purchases with live GPS delivery map</p>
            </div>
            <div className="header-stats">
              <div className="quick-stat">
                <span className="stat-value">{orders.length}</span>
                <span className="stat-label">Total Orders</span>
              </div>
            </div>
          </div>

          <div className="admin-content-area">
            {/* Toast Notification */}
            {toastMessage && (
              <Toast
                message={toastMessage}
                type={toastType}
                duration={3000}
                onClose={() => setToastMessage('')}
              />
            )}

            {/* Loading State */}
            {loading && <div className="loading">Loading your orders...</div>}

            {/* Error State */}
            {error && <div className="error-message">{error}</div>}

            {/* Filter Tabs */}
            {!loading && orders.length > 0 && (
              <div className="orders-filter-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button
                  className={`btn-tab ${filterTab === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterTab('all')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    border: filterTab === 'all' ? 'none' : '1px solid #d1d5db',
                    background: filterTab === 'all' ? '#16a34a' : '#fff',
                    color: filterTab === 'all' ? '#fff' : '#374151',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  All Orders ({orders.length})
                </button>
                <button
                  className={`btn-tab ${filterTab === 'in-transit' ? 'active' : ''}`}
                  onClick={() => setFilterTab('in-transit')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    border: filterTab === 'in-transit' ? 'none' : '1px solid #d1d5db',
                    background: filterTab === 'in-transit' ? '#16a34a' : '#fff',
                    color: filterTab === 'in-transit' ? '#fff' : '#374151',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🚚 In Transit / Active ({orders.filter(o => ['pending', 'accepted', 'processing', 'shipped'].includes(normalizeStatus(o.status))).length})
                </button>
                <button
                  className={`btn-tab ${filterTab === 'delivered' ? 'active' : ''}`}
                  onClick={() => setFilterTab('delivered')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    border: filterTab === 'delivered' ? 'none' : '1px solid #d1d5db',
                    background: filterTab === 'delivered' ? '#16a34a' : '#fff',
                    color: filterTab === 'delivered' ? '#fff' : '#374151',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ✅ Delivered ({orders.filter(o => ['delivered', 'completed'].includes(normalizeStatus(o.status))).length})
                </button>
                <button
                  className={`btn-tab ${filterTab === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setFilterTab('cancelled')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    border: filterTab === 'cancelled' ? 'none' : '1px solid #d1d5db',
                    background: filterTab === 'cancelled' ? '#16a34a' : '#fff',
                    color: filterTab === 'cancelled' ? '#fff' : '#374151',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ❌ Cancelled / Rejected ({orders.filter(o => ['cancelled', 'rejected'].includes(normalizeStatus(o.status))).length})
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredOrdersList.length === 0 && (
              <div className="empty-statee">
                <p>No Orders Found in this view</p>
                <button className="btn btn-primary" onClick={() => { setFilterTab('all'); navigate('/shop') }}>Explore Products</button>
              </div>
            )}

            {/* Orders List */}
            {!loading && filteredOrdersList.length > 0 && (
              <div className="orders-list">
                {filteredOrdersList.map((order) => {
                  const orderItems = order.products || order.items || []
                  const itemCount = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
                  const statusNorm = normalizeStatus(order.status)
                  const isInTransit = ['pending', 'accepted', 'processing', 'shipped'].includes(statusNorm)

                  return (
                    <div key={order.id} className="order-card1">
                      <div className="order-card-header">
                        <div className="order-header-left">
                          <span className="order-id1">Order #{order.id.slice(0, 8).toUpperCase()}</span>
                          <span className="order-date">{formatDate(order.createdAt)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isInTransit && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 800
                            }}>
                              <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }}></span>
                              LIVE GPS ACTIVE
                            </span>
                          )}
                          <span className={`order-status ${getOrderStatusClass(order)}`}>{getOrderStatusLabel(order)}</span>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      <div className="order-items-preview">
                        {orderItems.slice(0, 3).map((item, index) => (
                          <div key={index} className="order-item-mini">
                            <div className="item-image-wrapper">
                              {item.image || item.imageUrl ? (
                                <img src={item.image || item.imageUrl} alt={item.name} className="item-thumbnail" />
                              ) : (
                                <div className="item-placeholder">📦</div>
                              )}
                            </div>
                            <div className="item-details">
                              <span className="item-name">
                                {isItemUnavailable(item) ? 'Product not available' : item.name}
                              </span>
                              <span className="item-meta">
                                {isItemUnavailable(item)
                                  ? 'This product has been removed from the store.'
                                  : `Qty: ${item.quantity} × ${formatPrice(item.price)}`}
                              </span>
                            </div>
                            <span className="item-subtotal">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                        {orderItems.length > 3 && (
                          <div className="more-items-indicator">
                            +{orderItems.length - 3} more item{orderItems.length - 3 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {/* Order Summary */}
                      <div className="order-summary-bar">
                        <div className="summary-info">
                          <span className="summary-label">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
                          <span className="summary-divider">•</span>
                          <span className="summary-total">Total: {formatPrice(order.totalAmount)}</span>
                        </div>
                        <div className="order-actionss" style={{ gap: '8px' }}>
                          {!['cancelled', 'rejected'].includes(statusNorm) && (
                            <button
                              className="btn-view-details btn-gps-tracker"
                              onClick={() => handleOpenGpsModal(order)}
                              style={{
                                background: isInTransit ? '#16a34a' : '#0f766e',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Navigation size={14} />
                              {isInTransit ? 'Live GPS Tracker' : 'View Delivery Map'}
                            </button>
                          )}
                          {/* Pay Now via GCash button for unpaid / COD active orders */}
                          {!['cancelled', 'rejected'].includes(statusNorm) && order.paymentStatus !== 'Paid Online (GCash)' && (
                            <button
                              className="btn-view-details"
                              onClick={() => handleOpenGcashPayModal(order)}
                              style={{
                                background: '#005ce6',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <CreditCard size={14} />
                              Pay via GCash
                            </button>
                          )}
                          <button
                            className="btn-view-details"
                            onClick={() => handleViewDetails(order)}
                          >
                            View Details
                          </button>
                          {normalizeStatus(order.status) === 'pending' && !orderHasUnavailableItems(order) && (
                            <button
                              className="btn-cancel-orderr"
                              onClick={() => handleCancelClick(order.id)}
                            >
                              Cancel Order
                            </button>
                          )}
                          {orderHasUnavailableItems(order) && (
                            <div style={{ color: '#b91c1c', fontSize: '13px', marginTop: '6px' }}>
                              One or more items in this order are no longer available.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={handleCloseCancelModal}>
          <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
              {cancelError && <div className="error-message">{cancelError}</div>}
              <div className="modal-actions3">
                <button className="btn btn-secondary2" onClick={handleCloseCancelModal}>
                  Keep Order
                </button>
                <button className="btn btn-danger" onClick={handleConfirmCancel}>
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div className="details-section">
                <div className="detail-itemm">
                  <span className="detail-label">Order ID:</span>
                  <span className="detail-value">#{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="detail-itemm">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{formatDate(selectedOrder.createdAt)}</span>
                </div>
                <div className="detail-itemm">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-badge ${getOrderStatusClass(selectedOrder)}`}>{getOrderStatusLabel(selectedOrder)}</span>
                </div>
              </div>

              <div className="divider"></div>

              <div className="items-section">
                <h4 className="section-title">Items Ordered</h4>
                <div className="items-in-modal">
                  {(selectedOrder.products || selectedOrder.items || []).map((item, index) => (
                    <div key={index} className="modal-item">
                      <div className="modal-item-info">
                        <span className="modal-item-name">
                          {isItemUnavailable(item) ? 'Product not available' : item.name}
                        </span>
                        <span className="modal-item-qty">
                          {isItemUnavailable(item)
                            ? 'This product has been removed from the store.'
                            : `Qty: ${item.quantity}`}
                        </span>
                      </div>
                      <span className="modal-item-subtotal">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider"></div>

              <div className="summary-section">
                <div className="summary-item">
                  <span className="summary-label">Total Amount:</span>
                  <span className="summary-value">{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
                {selectedOrder.paymentMethod && (
                  <div className="summary-item">
                    <span className="summary-label">Payment Method:</span>
                    <span className="summary-value">{selectedOrder.paymentMethod}</span>
                  </div>
                )}
                {selectedOrder.paymentStatus && (
                  <div className="summary-item">
                    <span className="summary-label">Payment Status:</span>
                    <span className="summary-value" style={{ fontWeight: '700', color: selectedOrder.paymentStatus.includes('Paid') ? '#16a34a' : '#d97706' }}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                )}
                {selectedOrder.paymentDetails?.referenceNumber && (
                  <div className="summary-item">
                    <span className="summary-label">GCash Ref No.:</span>
                    <span className="summary-value" style={{ fontFamily: 'monospace', fontWeight: '700' }}>
                      {selectedOrder.paymentDetails.referenceNumber}
                    </span>
                  </div>
                )}
              </div>

              <button className="btn btn-primary btn-close-modal" onClick={handleCloseDetailsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live GPS Delivery Map Tracker Modal */}
      {showGpsModal && selectedGpsOrder && (
        <GpsDeliveryTrackerModal
          order={selectedGpsOrder}
          onClose={handleCloseGpsModal}
        />
      )}

      {/* GCash Pay Now Demo Gateway Modal */}
      <GcashDemoModal
        isOpen={showGcashPayModal}
        amount={selectedGcashPayOrder?.totalAmount || 0}
        onClose={() => {
          setShowGcashPayModal(false)
          setSelectedGcashPayOrder(null)
        }}
        onPaymentSuccess={handleGcashPaymentComplete}
      />
    </div>
  )
}
