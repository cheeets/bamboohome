import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { Toast } from '../components/Toast'
import UserSidebar from '../components/UserSidebar'
import '../css/Orders.css'
import '../css/AdminDashboardLayout.css'

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

  const normalizeStatus = (s) => (s || '').toString().toLowerCase()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    fetchOrders()
  }, [user, navigate, location])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'orders'), where('userId', '==', user.uid))
      const querySnapshot = await getDocs(q)
      const ordersList = []

      querySnapshot.forEach((doc) => {
        ordersList.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      // Sort by date descending
      ordersList.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)))
      setOrders(ordersList)
      setError('')
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

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

  const handleViewDetails = (order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedOrder(null)
  }

  return (
    <div className="admin-dashboard-layout">
      <UserSidebar activeView={activeView} setActiveView={setActiveView} />
      
      <main className="admin-main-content">
        <div className="admin-page-header">
          <div className="header-content">
            <h1>My Orders</h1>
            <p className="header-subtitle">Track and manage your bamboo purchases</p>
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

          {/* Empty State */}
          {!loading && orders.length === 0 && (
            <div className="empty-statee">
              <p>No Orders Yet</p>
              <button className="btn btn-primary" onClick={() => navigate('/shop')}>Start Shopping</button>
            </div>
          )}

          {/* Orders List */}
          {!loading && orders.length > 0 && (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card1">
                  <div className="order-card-header">
                      <span className="order-id1">Order #{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`order-status status-${normalizeStatus(order.status)}`}>{order.status}</span>
                  </div>

                  <div className="order-actionss">
                    <button
                      className="btn-view-details"
                      onClick={() => handleViewDetails(order)}
                    >
                      View Details
                    </button>
                    {normalizeStatus(order.status) === 'pending' && (
                      <button
                        className="btn-cancel-orderr"
                        onClick={() => handleCancelClick(order.id)}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={handleCloseCancelModal}>
          <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <p1>Are you sure you want to cancel this order? This action cannot be undone.</p1>
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
                  <span className={`detail-badge status-${normalizeStatus(selectedOrder.status)}`}>{selectedOrder.status}</span>
                </div>
              </div>

              <div className="divider"></div>

              <div className="items-section">
                <h4 className="section-title">Items Ordered</h4>
                <div className="items-in-modal">
                  {(selectedOrder.products || selectedOrder.items || []).map((item, index) => (
                    <div key={index} className="modal-item">
                      <div className="modal-item-info">
                        <span className="modal-item-name">{item.name}</span>
                        <span className="modal-item-qty">Qty: {item.quantity}</span>
                      </div>
                      <span className="modal-item-subtotal">₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider"></div>

              <div className="summary-section">
                <div className="summary-item">
                  <span className="summary-label">Total Amount:</span>
                  <span className="summary-value">₱{selectedOrder.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
                {selectedOrder.paymentMethod && (
                  <div className="summary-item">
                    <span className="summary-label">Payment Method:</span>
                    <span className="summary-value">{selectedOrder.paymentMethod}</span>
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
    </div>
  )
}
