import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, onSnapshot, doc, getDoc, updateDoc, orderBy } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { ProductCard } from '../components/ProductCard'
import { ProductModal } from '../components/ProductModal'
import { Chat } from './Chat'
import { Bar, Pie } from 'react-chartjs-2'
import SellerSidebar from '../components/SellerSidebar'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { notifyOrderStatusChange } from '../services/notificationService'
import { calculateAverageRating, getStockStatus, formatPrice } from '../utils/rating'
import { AlertTriangle, BarChart3, MessageCircle, Package, Plus, ShoppingBag, Truck } from 'lucide-react'
import { Toast } from '../components/Toast'
import '../css/BuyerLayout.css'
import '../css/ShopPage.css'
import '../css/SellerDashboard.css'
import '../css/AdminDashboardLayout.css'
import '../css/DashboardTheme.css'
import '../css/Messaging.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export function SellerDashboard() {
  const navigate = useNavigate()
  const { user, userRole, isSuspended, suspensionReason, suspensionEndAt, logout } = useAuth()

  const [countdown, setCountdown] = useState('')
  
  // Countdown timer logic
  useEffect(() => {
    if (!isSuspended || !suspensionEndAt) return

    const updateCountdown = () => {
      const now = new Date()
      const end = suspensionEndAt.toDate ? suspensionEndAt.toDate() : new Date(suspensionEndAt)
      const diff = end - now

      if (diff <= 0) {
        setCountdown('Expired')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      let countdownStr = ''
      if (days > 0) countdownStr += `${days}d `
      if (hours > 0 || days > 0) countdownStr += `${hours}h `
      if (minutes > 0 || hours > 0 || days > 0) countdownStr += `${minutes}m `
      countdownStr += `${seconds}s`

      setCountdown(countdownStr.trim())
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [isSuspended, suspensionEndAt])

  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('month')

  const [showProductModal, setShowProductModal] = useState(false)
  const [modalCategory, setModalCategory] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [ordersWithDetails, setOrdersWithDetails] = useState([])
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false)

  const [activeView, setActiveView] = useState('analytics')
  const [activeSubView, setActiveSubView] = useState('analytics-overview')
  const [categories, setCategories] = useState([])
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  // Real-time products listener for inventory monitoring
  useEffect(() => {
    if (!user) return

    fetchCategories()

    const q = query(
      collection(db, 'products'),
      where('sellerId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        list.push({
          id: docSnap.id,
          ...data,
          storeName: data.storeName || 'GreenNest',
        })
      })
      list.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)))
      setProducts(list)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('name', 'asc'))
      const querySnapshot = await getDocs(q)
      const list = []
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setCategories(list)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const q = query(
        collection(db, 'products'),
        where('sellerId', '==', user.uid),
      )
      const snapshot = await getDocs(q)
      const list = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        list.push({
          id: docSnap.id,
          ...data,
          storeName: data.storeName || 'GreenNest',
        })
      })
      // Sort by date descending in the app
      list.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)))
      setProducts(list)
      setError('')
    } catch (err) {
      console.error('Error fetching seller products:', err)
      setProducts([])
      setError('Failed to load your products.')
    } finally {
      setLoading(false)
    }
  }

  const enrichOrdersWithUserDetails = async (ordersList) => {
    try {
      setLoadingOrderDetails(true)
      const enrichedOrders = await Promise.all(
        ordersList.map(async (order) => {
          try {
            const userDocRef = doc(db, 'users', order.userId)
            const userDocSnap = await getDoc(userDocRef)
            const userData = userDocSnap.exists() ? userDocSnap.data() : {}
            return {
              ...order,
              buyerName: userData.name || order.userEmail || 'Unknown',
              buyerEmail: order.userEmail || userData.email || 'N/A',
            }
          } catch (err) {
            console.error(`Error fetching user details for order ${order.id}:`, err)
            return {
              ...order,
              buyerName: 'Unknown',
              buyerEmail: order.userEmail || 'N/A',
            }
          }
        })
      )
      setOrdersWithDetails(enrichedOrders)
    } catch (err) {
      console.error('Error enriching orders:', err)
    } finally {
      setLoadingOrderDetails(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    console.log('🔄 updateOrderStatus called:', { orderId, newStatus })
    
    if (newStatus === 'Delivered') {
      // Show modal to add delivery message
      setSelectedOrderForDelivery(orderId)
      setDeliveryMessage('We are going to deliver your items today!')
      setShowDeliveryModal(true)
      return
    }

    try {
      const orderRef = doc(db, 'orders', orderId)
      
      // Get order details to find the buyer's userId
      console.log('📖 Fetching order document...')
      const orderDoc = await getDoc(orderRef)
      if (!orderDoc.exists()) {
        throw new Error('Order not found')
      }
      
      const orderData = orderDoc.data()
      const buyerUserId = orderData.userId
      console.log('👤 Buyer userId:', buyerUserId)
      
      // Update order status
      console.log('💾 Updating order status in Firestore...')
      await updateDoc(orderRef, { status: newStatus })
      console.log('✅ Order status updated in Firestore')
      
      // Trigger notification for buyer
      if (buyerUserId) {
        console.log('🔔 Calling notifyOrderStatusChange...')
        await notifyOrderStatusChange(buyerUserId, orderId, newStatus)
        console.log('✅ Notification triggered')
      } else {
        console.warn('⚠️ No buyerUserId found, skipping notification')
      }
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
      
      console.log(`✅ Order ${orderId} updated to ${newStatus}`)
    } catch (err) {
      console.error('❌ Error updating order status:', err)
      setToastMessage(`Failed to update order status: ${err.message}`)
      setToastType('error')
    }
  }

  const handleConfirmDelivery = async () => {
    if (!selectedOrderForDelivery) return

    try {
      const orderRef = doc(db, 'orders', selectedOrderForDelivery)
      
      // Get order details to find the buyer's userId
      const orderDoc = await getDoc(orderRef)
      if (!orderDoc.exists()) {
        throw new Error('Order not found')
      }
      
      const orderData = orderDoc.data()
      const buyerUserId = orderData.userId
      const finalMessage = deliveryMessage.trim() || 'Your order is on the way!'
      
      // Update order status with delivery message
      await updateDoc(orderRef, { 
        status: 'Delivered',
        deliveryMessage: finalMessage
      })
      
      // Trigger notification for buyer with custom message
      if (buyerUserId) {
        await notifyOrderStatusChange(buyerUserId, selectedOrderForDelivery, 'Delivered', finalMessage)
      }
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrderForDelivery ? { ...order, status: 'Delivered' } : order
        )
      )
      
      setShowDeliveryModal(false)
      setSelectedOrderForDelivery(null)
      setDeliveryMessage('')
      
      console.log(`Order ${selectedOrderForDelivery} marked as delivered`)
      setToastMessage('Order marked as delivered!')
      setToastType('success')
    } catch (err) {
      console.error('Error updating order status:', err)
      setToastMessage(`Failed to update order status: ${err.message}`)
      setToastType('error')
    }
  }

  const handleViewDetails = (order) => {
    // Order details removed
  }

  const handleCloseDetails = () => {
    // Order details removed
  }

  const normalizeOrderStatus = (status = '') => status.toString().trim().toLowerCase()

  const getOrderItems = (order = {}) => order?.products || order?.items || []

  const getOrderTotal = (order = {}) => {
    const items = getOrderItems(order)
    if (items.length > 0) {
      return items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0)
    }
    return Number(order.totalAmount || 0)
  }

  const getBuyerDisplayName = (order) => {
    return order.buyerName || order.buyerEmail || order.userEmail || 'Unknown Buyer'
  }

  const formatOrderDate = (createdAt) => {
    if (!createdAt) return 'N/A'
    if (createdAt?.toDate) return createdAt.toDate().toLocaleDateString()
    const parsed = new Date(createdAt)
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString()
  }

  const getSalesStats = () => {
    const productMap = {}
    const salesByProduct = {}
    let totalRevenue = 0
    let totalOrders = orders.length

    orders.forEach((order) => {
      const normalizedStatus = normalizeOrderStatus(order.status)
      if (normalizedStatus === 'delivered' || normalizedStatus === 'completed') {
        totalRevenue += getOrderTotal(order)
        getOrderItems(order).forEach((item) => {
          const productName = item.name || 'Unknown Product'
          if (!productMap[productName]) {
            productMap[productName] = { quantity: 0, revenue: 0 }
          }
          const quantity = item.quantity || 1
          productMap[productName].quantity += quantity
          productMap[productName].revenue += (item.price || 0) * quantity
          salesByProduct[productName] = (salesByProduct[productName] || 0) + quantity
        })
      }
    })

    return { productMap, totalRevenue, totalOrders, salesByProduct }
  }

  const getOrdersByTimeframe = () => {
    const now = new Date()
    const grouped = {}

    orders.forEach((order) => {
      const normalizedStatus = normalizeOrderStatus(order.status)
      const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
      let key

      if (analyticsTimeframe === 'week') {
        const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24))
        if (daysAgo <= 30) key = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (analyticsTimeframe === 'month') {
        const monthsAgo = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth())
        if (monthsAgo <= 12) key = orderDate.toLocaleDateString('en-US', { year: '2-digit', month: 'short' })
      } else if (analyticsTimeframe === 'year') {
        key = orderDate.getFullYear().toString()
      }

      if (key) {
        if (!grouped[key]) {
          grouped[key] = { total: 0, completed: 0, pending: 0 }
        }
        grouped[key].total++
        if (normalizedStatus === 'delivered' || normalizedStatus === 'completed') {
          grouped[key].completed++
        } else if (normalizedStatus === 'pending') {
          grouped[key].pending++
        }
      }
    })

    return Object.entries(grouped).sort()
  }

  const analyticsData = getOrdersByTimeframe()
  const { productMap, totalRevenue, totalOrders, salesByProduct } = getSalesStats()

  // Inventory assistant logic
  const inventoryStats = useMemo(() => {
    const lowStock = products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 5) && (p.stock || 0) > 0)
    const outOfStock = products.filter(p => (p.stock || 0) <= 0)
    
    // Stock suggestions based on sales trends and current stock
    const suggestions = products.map(product => {
      const salesCount = salesByProduct[product.name] || 0
      const currentStock = product.stock || 0
      const threshold = product.lowStockThreshold || 5
      
      let priority = 'low'
      let message = ''
      
      if (currentStock <= 0) {
        priority = 'high'
        message = `URGENT: ${product.name} is out of stock. Restock immediately to capture missed sales.`
      } else if (currentStock <= threshold) {
        priority = 'medium'
        message = `Warning: ${product.name} is low on stock (${currentStock} left). Based on sales trends, restock soon.`
      } else if (salesCount > 10 && currentStock < salesCount * 1.5) {
        priority = 'low'
        message = `Suggestion: ${product.name} is a high-demand item. Consider increasing stock levels.`
      }
      
      return message ? { id: product.id, priority, message } : null
    }).filter(Boolean)

    return { lowStock, outOfStock, suggestions }
  }, [products, salesByProduct])

  const inventoryPreviewProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const aStock = Number(a.stock || 0)
        const bStock = Number(b.stock || 0)
        return aStock - bStock
      })
      .slice(0, 8)
  }, [products])

  const barChartData = {
    labels: analyticsData.map(([period]) => period),
    datasets: [
      {
        label: 'Total Orders',
        data: analyticsData.map(([, data]) => data.total),
        backgroundColor: 'rgba(46, 125, 50, 0.15)',
        borderColor: '#2E7D32',
        borderWidth: 3,
        borderRadius: 8,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Completed',
        data: analyticsData.map(([, data]) => data.completed),
        backgroundColor: 'rgba(67, 160, 71, 0.2)',
        borderColor: '#43A047',
        borderWidth: 3,
        borderRadius: 8,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Pending',
        data: analyticsData.map(([, data]) => data.pending),
        backgroundColor: 'rgba(245, 124, 0, 0.15)',
        borderColor: '#F57C00',
        borderWidth: 3,
        borderRadius: 8,
        borderDash: [8, 5],
        fill: false,
        tension: 0.4,
      },
    ],
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 16,
          padding: 18,
          font: { size: 13, family: 'Plus Jakarta Sans', weight: 700 },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: `Sales Trend (${analyticsTimeframe === 'week' ? 'Last 30 Days' : analyticsTimeframe === 'month' ? 'Last 12 Months' : 'By Year'})`,
        font: { size: 18, family: 'Plus Jakarta Sans', weight: 800 },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1A1A1A',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 10,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 700 },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13, weight: 600 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: { size: 12, weight: 600, family: 'Plus Jakarta Sans' },
          color: '#5F6368',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: 12, weight: 600, family: 'Plus Jakarta Sans' },
          precision: 0,
          color: '#5F6368',
        },
        grid: { color: 'rgba(46, 125, 50, 0.08)' },
      },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
    },
  }

  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8)

  const pieChartData = {
    labels: topProducts.map(([name]) => name),
    datasets: [
      { 
        data: topProducts.map(([, data]) => data.revenue), 
        backgroundColor: [
          'rgba(46, 125, 50, 0.85)',
          'rgba(67, 160, 71, 0.85)',
          'rgba(102, 187, 106, 0.85)',
          'rgba(165, 214, 167, 0.85)',
          'rgba(245, 124, 0, 0.85)',
          'rgba(255, 152, 0, 0.85)',
          'rgba(25, 118, 210, 0.85)',
          'rgba(103, 58, 183, 0.85)',
        ],
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 10,
      },
    ],
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { 
        position: 'right',
        labels: {
          boxWidth: 16,
          padding: 18,
          font: { size: 13, family: 'Plus Jakarta Sans', weight: 700 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#1A1A1A',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 10,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 700 },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13, weight: 600 },
        callbacks: {
          label: function (context) {
            const label = context.label || ''
            const value = context.parsed
            const percentage = ((value / totalRevenue) * 100).toFixed(1)
            return `${label}: ₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentage}%)`
          },
        },
      },
      title: { display: true, text: 'Revenue by Product', font: { size: 18, family: 'Plus Jakarta Sans', weight: 800 } },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart',
    },
  }

  useEffect(() => {
    if (!user) return
    if (userRole !== 'seller') {
      navigate('/', { replace: true })
      return
    }

    fetchProducts()
    
    // Real-time listener for seller orders
    const q = query(
      collection(db, 'orders'),
      where('sellerId', '==', user.uid),
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = []
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() })
      })
      // Sort by date descending in the app
      list.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)))
      setOrders(list)
    }, (error) => {
      console.error('Error listening to seller orders:', error)
    })
    
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, userRole])

  // Enrich orders with user details when orders change
  useEffect(() => {
    if (orders.length > 0) {
      enrichOrdersWithUserDetails(orders)
    } else {
      setOrdersWithDetails([])
    }
  }, [orders])

  // Listen for seller notifications
  useEffect(() => {
    if (!user) return
    console.log('🔔 Listening for notifications for user:', user.uid)
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      console.log('📥 Received notifications:', notifs)
      setNotifications(notifs)
    }, (error) => {
      console.error('❌ Error fetching notifications:', error)
    })
    return unsubscribe
  }, [user])

  const markNotificationAsRead = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId)
      await updateDoc(notifRef, { isRead: true })
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const canManage = useMemo(() => userRole === 'seller', [userRole])

  // Filter pending orders
  const pendingOrders = ordersWithDetails.filter(order => 
    normalizeOrderStatus(order.status) === 'pending'
  )

  // Filter processing and completed orders
  const processingOrders = ordersWithDetails.filter(order => 
    normalizeOrderStatus(order.status) === 'processing' || normalizeOrderStatus(order.status) === 'shipped'
  )

  const completedOrders = ordersWithDetails.filter(order => 
    normalizeOrderStatus(order.status) === 'completed' || normalizeOrderStatus(order.status) === 'delivered'
  )

  const renderOrderSection = ({
    title,
    description,
    list,
    emptyMessage,
    actionLabel,
    actionStatus,
    actionClassName,
  }) => (
    <section className="orders-section-card">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p className="section-caption">{description}</p>
        </div>
      </div>

      {loadingOrderDetails && <div className="loading">Loading order details...</div>}

      {!loadingOrderDetails && list.length === 0 && (
        <div className="empty-state">
          <p>{emptyMessage}</p>
        </div>
      )}

      {!loadingOrderDetails && list.length > 0 && (
        <div className="seller-order-grid">
          {list.map((order) => {
            const orderItems = getOrderItems(order)
            return (
              <article key={order.id} className="seller-order-card">
                <div className="seller-order-card-header">
                  <div>
                    <span className="seller-order-label">Order</span>
                    <h3>#{order.id.slice(0, 8).toUpperCase()}</h3>
                  </div>
                  <span className={`status-badge status-${normalizeOrderStatus(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="seller-order-meta">
                  <div>
                    <span className="seller-order-label">Buyer</span>
                    <strong>{getBuyerDisplayName(order)}</strong>
                    <p>{order.buyerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="seller-order-label">Placed</span>
                    <strong>{formatOrderDate(order.createdAt)}</strong>
                    <p>{order.address?.phoneNumber || 'No phone provided'}</p>
                  </div>
                </div>

                <div className="seller-order-address">
                  <span className="seller-order-label">Delivery Address</span>
                  <p>{order.address?.addressLine || 'No address provided'}</p>
                </div>

                <div className="seller-order-items">
                  {orderItems.map((item, index) => (
                    <div key={`${order.id}-${index}`} className="seller-order-item">
                      <div className="seller-order-item-image">
                        {item.image || item.imageUrl ? (
                          <img src={item.image || item.imageUrl} alt={item.name || 'Ordered product'} />
                        ) : (
                          <div className="seller-order-item-fallback">
                            <ShoppingBag size={16} />
                          </div>
                        )}
                      </div>
                      <div className="seller-order-item-info">
                        <strong>{item.name || 'Unknown product'}</strong>
                        <span>Qty: {item.quantity || 1}</span>
                      </div>
                      <span className="seller-order-item-price">
                        {formatPrice((item.price || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="seller-order-footer">
                  <div className="seller-order-total">
                    <span className="seller-order-label">Seller Total</span>
                    <strong>{formatPrice(getOrderTotal(order))}</strong>
                  </div>
                  {actionLabel && actionStatus && (
                    <button
                      className={actionClassName}
                      onClick={() => updateOrderStatus(order.id, actionStatus)}
                    >
                      {actionLabel}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )

  return (
    <>
      {isSuspended ? (
        <div className="admin-dashboard-layout">
          <div className="dashboard-shell-inner">
            <main className="admin-main-content dashboard-main-panel">
              <div className="admin-page-header">
                <div className="header-content">
                  <h1>Account Suspended</h1>
                  <p className="header-subtitle">Your seller account has been suspended.</p>
                </div>
              </div>
              <div className="admin-content-area" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 40px', 
                  background: '#fff', 
                  borderRadius: '16px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  maxWidth: '500px',
                  width: '100%'
                }}>
                  <AlertTriangle size={80} style={{ color: '#EF4444', marginBottom: '24px' }} />
                  <h2 style={{ 
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#1f2937', 
                    marginBottom: '16px'
                  }}>Your Account is Suspended</h2>
                  <p style={{ 
                    color: '#4b5563', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    marginBottom: '24px'
                  }}>
                    {suspensionReason || 'Your seller account has been suspended due to a violation of our platform guidelines.'}
                  </p>
                  {countdown && countdown !== 'Expired' && (
                    <div style={{ 
                      background: '#FEF3C7', 
                      border: '1px solid #FCD34D',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '24px',
                      textAlign: 'center'
                    }}>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#92400E', 
                        marginBottom: '8px',
                        fontWeight: '500'
                      }}>
                        Time Remaining Until Auto-Unsuspend:
                      </p>
                      <p style={{ 
                        fontSize: '24px', 
                        fontWeight: '700', 
                        color: '#B45309',
                        margin: 0
                      }}>
                        {countdown}
                      </p>
                    </div>
                  )}
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '14px', 
                    marginBottom: '32px'
                  }}>
                    If you believe this is a mistake, please contact our support team for assistance.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await logout()
                        navigate('/shop')
                      } catch (error) {
                        console.error('Logout error:', error)
                      }
                    }}
                    style={{
                      background: '#EF4444',
                      color: '#fff',
                      border: 'none',
                      padding: '14px 32px',
                      fontSize: '16px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#DC2626'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#EF4444'
                    }}
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      ) : (
        <div className="admin-dashboard-layout seller-dashboard-layout">
          <div className="dashboard-shell-inner">
            <SellerSidebar 
              activeView={activeView} 
              setActiveView={setActiveView}
            />
          
            <main className="admin-main-content dashboard-main-panel">
              {/* Header */}
              <div className="admin-page-header">
                <div className="header-content">
                  <h1>Seller Dashboard</h1>
                  <p className="header-subtitle">
                    {activeView === 'analytics' && 'Sales Performance & Insights'}
                    {activeView === 'orders' && 'Order Management'}
                    {activeView === 'products' && 'Product Inventory'}
                  </p>
                </div>
                <div className="header-stats">
                  <div className="quick-stat">
                    <span className="stat-value" style={{ 
                      fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '3px'
                    }}>
                      <span style={{ fontSize: '16px', fontWeight: 700 }}>₱</span>
                      <span>{(totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>
                    <span className="stat-label">Revenue</span>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-value" style={{ 
                      fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontWeight: 800,
                      letterSpacing: '-0.01em'
                    }}>{totalOrders.toLocaleString()}</span>
                    <span className="stat-label">Orders</span>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-value" style={{ 
                      fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontWeight: 800,
                      letterSpacing: '-0.01em'
                    }}>{products.length.toLocaleString()}</span>
                    <span className="stat-label">Products</span>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="admin-content-area">
                {activeView === 'analytics' && (
                  <div className="seller-dashboard-container" style={{ padding: 0, background: 'none' }}>
                    {/* Sales Analytics Section */}
                    <section className="analytics-section" style={{ maxWidth: '100%', margin: 0 }}>
                      <div className="analytics-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)', 
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)'
                          }}>
                            <BarChart3 size={24} />
                          </div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1A1A1A' }}>Sales Analytics</h2>
                            <p style={{ margin: '4px 0 0', color: '#5F6368', fontSize: '14px' }}>Track your performance and sales trends</p>
                          </div>
                        </div>
                        <div className="timeframe-selector">
                          <button
                            className={`timeframe-btn ${analyticsTimeframe === 'week' ? 'active' : ''}`}
                            onClick={() => setAnalyticsTimeframe('week')}
                          >
                            30 Days
                          </button>
                          <button
                            className={`timeframe-btn ${analyticsTimeframe === 'month' ? 'active' : ''}`}
                            onClick={() => setAnalyticsTimeframe('month')}
                          >
                            12 Months
                          </button>
                          <button
                            className={`timeframe-btn ${analyticsTimeframe === 'year' ? 'active' : ''}`}
                            onClick={() => setAnalyticsTimeframe('year')}
                          >
                            By Year
                          </button>
                        </div>
                      </div>

                      {/* Key Metrics */}
                      <div className="metrics-grid">
                        <div className="metric-card">
                          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)', color: '#fff', fontSize: '24px', fontWeight: 800 }}>₱</div>
                          <div className="metric-content">
                            <h3>Total Revenue</h3>
                            <p className="metric-value" style={{ 
                              fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                              fontSize: '28px',
                              fontWeight: 800,
                              letterSpacing: '-0.01em',
                              lineHeight: 1.2,
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: '3px',
                              overflow: 'visible',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              <span style={{ fontSize: '20px', fontWeight: 700 }}>₱</span>
                              <span>{(totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </p>
                          </div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff' }}><Package size={22} /></div>
                          <div className="metric-content">
                            <h3>Completed Orders</h3>
                            <p className="metric-value" style={{ 
                              fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                              fontSize: '32px',
                              fontWeight: 800,
                              letterSpacing: '-0.02em',
                              lineHeight: 1.1
                            }}>{totalOrders}</p>
                          </div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#fff' }}><ShoppingBag size={22} /></div>
                          <div className="metric-content">
                            <h3>Active Products</h3>
                            <p className="metric-value" style={{ 
                              fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                              fontSize: '32px',
                              fontWeight: 800,
                              letterSpacing: '-0.02em',
                              lineHeight: 1.1
                            }}>{products.length}</p>
                          </div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff' }}><BarChart3 size={22} /></div>
                          <div className="metric-content">
                            <h3>Top Product</h3>
                            <p className="metric-value" style={{ 
                              fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                              fontSize: '20px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                              fontWeight: 700
                            }}>
                              {topProducts.length > 0 ? topProducts[0][0] : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Charts */}
                      <div className="charts-grid">
                        <div className="chart-container" style={{ minHeight: '400px' }}>
                          <Bar data={barChartData} options={barChartOptions} />
                        </div>
                        <div className="chart-container" style={{ minHeight: '400px' }}>
                          {topProducts.length > 0 ? (
                            <Pie data={pieChartData} options={pieChartOptions} />
                          ) : (
                            <div className="empty-chart" style={{ 
                              height: '100%', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              color: '#9AA0A6',
                              fontSize: '14px'
                            }}>
                              <ShoppingBag size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                              No sales data available
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Top Products Table */}
                      {topProducts.length > 0 && (
                        <div className="top-products-section" style={{ 
                          background: '#fff', 
                          border: '1px solid #E8ECE9', 
                          borderRadius: '16px', 
                          padding: '24px',
                          marginTop: '24px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                        }}>
                          <h3 style={{ 
                            margin: '0 0 20px', 
                            fontSize: '20px', 
                            fontWeight: 700, 
                            color: '#1A1A1A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <ShoppingBag size={20} style={{ color: '#2E7D32' }} />
                            Top Performing Products
                          </h3>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="products-table" style={{ 
                              width: '100%', 
                              borderCollapse: 'separate', 
                              borderSpacing: '0',
                              minWidth: '500px'
                            }}>
                              <thead>
                                <tr style={{ background: '#F1F8F1' }}>
                                  <th style={{ 
                                    padding: '14px 18px', 
                                    textAlign: 'left', 
                                    fontSize: '12px', 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.08em', 
                                    color: '#2E7D32',
                                    borderBottom: '2px solid rgba(46, 125, 50, 0.1)'
                                  }}>Product Name</th>
                                  <th style={{ 
                                    padding: '14px 18px', 
                                    textAlign: 'left', 
                                    fontSize: '12px', 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.08em', 
                                    color: '#2E7D32',
                                    borderBottom: '2px solid rgba(46, 125, 50, 0.1)'
                                  }}>Units Sold</th>
                                  <th style={{ 
                                    padding: '14px 18px', 
                                    textAlign: 'left', 
                                    fontSize: '12px', 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.08em', 
                                    color: '#2E7D32',
                                    borderBottom: '2px solid rgba(46, 125, 50, 0.1)'
                                  }}>Revenue</th>
                                  <th style={{ 
                                    padding: '14px 18px', 
                                    textAlign: 'left', 
                                    fontSize: '12px', 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.08em', 
                                    color: '#2E7D32',
                                    borderBottom: '2px solid rgba(46, 125, 50, 0.1)'
                                  }}>Percentage</th>
                                </tr>
                              </thead>
                              <tbody>
                                {topProducts.map(([name, data], index) => (
                                  <tr key={index} style={{ 
                                    transition: 'background-color 0.2s'
                                  }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F8F1'}
                                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ 
                                      padding: '16px 18px', 
                                      fontSize: '15px', 
                                      fontWeight: 600, 
                                      color: '#1A1A1A',
                                      borderBottom: '1px solid #E8ECE9',
                                      fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif'
                                    }}>{name}</td>
                                    <td style={{ 
                                      padding: '16px 18px', 
                                      fontSize: '16px', 
                                      fontWeight: 700, 
                                      color: '#1A1A1A',
                                      borderBottom: '1px solid #E8ECE9',
                                      fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                                      letterSpacing: '-0.01em'
                                    }}>{data.quantity.toLocaleString()}</td>
                                    <td style={{ 
                                      padding: '16px 18px', 
                                      fontSize: '16px', 
                                      fontWeight: 800, 
                                      color: '#2E7D32',
                                      borderBottom: '1px solid #E8ECE9',
                                      fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                                      display: 'flex',
                                      alignItems: 'baseline',
                                      gap: '4px'
                                    }}>
                                      <span style={{ fontSize: '14px', fontWeight: 700 }}>₱</span>
                                      <span>{data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </td>
                                    <td style={{ 
                                      padding: '16px 18px', 
                                      fontSize: '14px', 
                                      fontWeight: 700, 
                                      color: '#5F6368',
                                      borderBottom: '1px solid #E8ECE9',
                                      fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif'
                                    }}>
                                      <span style={{ 
                                        background: 'rgba(46, 125, 50, 0.1)', 
                                        padding: '6px 12px', 
                                        borderRadius: '8px',
                                        color: '#2E7D32',
                                        fontWeight: 800
                                      }}>
                                        {((data.revenue / totalRevenue) * 100).toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {activeView === 'inventory' && (
                  <div className="seller-dashboard-container" style={{ padding: 0, background: 'none' }}>
                    <section className="inventory-section">
                      <div className="inventory-assistant-header">
                        <div className="inventory-assistant-title">
                          <span className="inventory-assistant-icon"><Package size={22} /></span>
                          <div>
                            <h2>Inventory Assistant</h2>
                            <p>Stock alerts and restock suggestions for your catalog</p>
                          </div>
                        </div>
                        <div className="inventory-assistant-status">
                          <span className="pulse-dot"></span>
                          Real-time monitoring active
                        </div>
                      </div>

                      <div className="inventory-suggestions-grid">
                        {inventoryStats.suggestions.length > 0 ? (
                          inventoryStats.suggestions.map((suggestion, idx) => (
                            <div key={idx} className={`suggestion-card ${suggestion.priority}`}>
                              <span className="suggestion-badge">{suggestion.priority.toUpperCase()}</span>
                              <p>{suggestion.message}</p>
                              <button className="btn-action-suggestion" onClick={() => setActiveView('products')}>
                                View Product
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="suggestion-card healthy">
                            <p>All stock levels look healthy based on current trends. Great job!</p>
                          </div>
                        )}
                      </div>

                      <div className="inventory-overview-grid">
                        <div className={`inventory-card inventory-card-out ${inventoryStats.outOfStock.length > 0 ? 'has-alert' : ''}`}>
                          <h3>Out of Stock</h3>
                          <div className="inventory-num">{inventoryStats.outOfStock.length}</div>
                          <p>Products currently unavailable to buyers</p>
                        </div>

                        <div className={`inventory-card inventory-card-low ${inventoryStats.lowStock.length > 0 ? 'has-alert' : ''}`}>
                          <h3>Low Stock</h3>
                          <div className="inventory-num">{inventoryStats.lowStock.length}</div>
                          <p>Products nearing threshold</p>
                        </div>

                        <div className="inventory-card inventory-card-total">
                          <h3>Total Items in Stock</h3>
                          <div className="inventory-num">
                            {products.reduce((acc, p) => acc + (p.stock || 0), 0)}
                          </div>
                          <p>Total units across all products</p>
                        </div>
                      </div>

                      <div className="inventory-spotlight-section">
                        <div className="inventory-section-heading">
                          <div>
                            <h3>Inventory Spotlight</h3>
                            <p>Quick view of products that need immediate attention.</p>
                          </div>
                        </div>
                        <div className="inventory-spotlight-grid">
                          {inventoryPreviewProducts.map((product) => {
                            const stockStatus = getStockStatus(product)
                            return (
                              <article key={product.id} className="inventory-spotlight-card">
                                <div className="inventory-spotlight-image">
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} />
                                  ) : (
                                    <div className="inventory-image-fallback">
                                      <ShoppingBag size={18} />
                                    </div>
                                  )}
                                </div>
                                <div className="inventory-spotlight-content">
                                  <div className="inventory-spotlight-top">
                                    <span className={`status-tag ${stockStatus.class}`}>{stockStatus.label}</span>
                                    <span className="inventory-price">{formatPrice(product.price || 0)}</span>
                                  </div>
                                  <h4>{product.name}</h4>
                                  <p>{categories.find(c => c.id === product.category)?.name || product.category || 'Uncategorized'}</p>
                                  <div className="inventory-spotlight-stats">
                                    <span>Stock: {product.stock || 0}</span>
                                    <span>Threshold: {product.lowStockThreshold || 5}</span>
                                  </div>
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      </div>

                      {/* Inventory Table */}
                      <div className="inventory-table-container">
                        <h3>Full Inventory List</h3>
                        <table className="inventory-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Category</th>
                              <th>Current Stock</th>
                              <th>Threshold</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map(product => {
                              const isOutOfStock = (product.stock || 0) <= 0
                              const isLowStock = (product.stock || 0) <= (product.lowStockThreshold || 5)
                              return (
                                <tr key={product.id} className={isOutOfStock ? 'row-out' : isLowStock ? 'row-low' : ''}>
                                  <td>
                                    <div className="inventory-product-cell">
                                      <img src={product.imageUrl} alt="" className="mini-thumb" />
                                      <div className="inventory-product-text">
                                        <strong>{product.name}</strong>
                                        <span>{formatPrice(product.price || 0)}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    {categories.find(c => c.id === product.category)?.name || product.category}
                                  </td>
                                  <td>
                                    <span className="stock-count">{product.stock || 0}</span>
                                  </td>
                                  <td>{product.lowStockThreshold || 5}</td>
                                  <td>
                                    <span className={`status-tag ${isOutOfStock ? 'out' : isLowStock ? 'low' : 'ok'}`}>
                                      {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy'}
                                    </span>
                                  </td>
                                  <td>
                                    <button className="btn-table-edit" onClick={() => {
                                      setEditingProduct(product)
                                      setModalCategory(product.category)
                                      setShowProductModal(true)
                                    }}>
                                      Update Stock
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                )}

                {activeView === 'orders' && (
                  <div className="seller-dashboard-container" style={{ padding: 0, background: 'none' }}>
                    <div className="orders-summary-cards">
                      <div className="summary-card pending">
                        <span className="summary-icon"><Package size={18} /></span>
                        <div className="summary-info">
                          <h3>Pending</h3>
                          <p>{pendingOrders.length} Orders</p>
                        </div>
                      </div>
                      <div className="summary-card processing">
                        <span className="summary-icon"><Truck size={18} /></span>
                        <div className="summary-info">
                          <h3>Processing</h3>
                          <p>{processingOrders.length} Orders</p>
                        </div>
                      </div>
                      <div className="summary-card completed">
                        <span className="summary-icon"><ShoppingBag size={18} /></span>
                        <div className="summary-info">
                          <h3>Order History</h3>
                          <p>{completedOrders.length} Sold</p>
                        </div>
                      </div>
                    </div>

                    {renderOrderSection({
                      title: 'Pending Orders',
                      description: 'New buyer requests waiting for your confirmation.',
                      list: pendingOrders,
                      emptyMessage: 'No pending orders yet. Great job keeping up.',
                      actionLabel: 'Process Order',
                      actionStatus: 'Processing',
                      actionClassName: 'btn-accept',
                    })}

                    <div style={{ marginTop: '30px' }}>
                      {renderOrderSection({
                        title: 'Active Deliveries',
                        description: 'Orders already being prepared or shipped to buyers.',
                        list: processingOrders,
                        emptyMessage: 'No active deliveries right now.',
                        actionLabel: 'Mark Delivered',
                        actionStatus: 'Delivered',
                        actionClassName: 'btn-complete',
                      })}
                    </div>

                    <div style={{ marginTop: '30px' }}>
                      {renderOrderSection({
                        title: 'Order History',
                        description: 'Completed sales with buyer details and sold items.',
                        list: completedOrders,
                        emptyMessage: 'No completed sales yet.',
                      })}
                    </div>
                  </div>
                )}

                {activeView === 'products' && (
                  <div className="seller-dashboard-container seller-products-view">
                    <section className="seller-products-section">
                      <div className="panel-header">
                        <div className="panel-header-text">
                          <h1>My Products</h1>
                          <p>Manage your catalog, stock, and listings</p>
                        </div>
                        <div className="panel-header-actions">
                          <span className="seller-product-count">{products.length} {products.length === 1 ? 'product' : 'products'}</span>
                          <button
                            onClick={() => {
                              setEditingProduct(null)
                              setModalCategory(categories.length > 0 ? categories[0].id : '')
                              setShowProductModal(true)
                            }}
                            className="btn-add-product-seller"
                            title="Add New Product"
                          >
                            <Plus size={16} /> Add Product
                          </button>
                        </div>
                      </div>

                      {loading && <div className="loading">Loading products...</div>}
                      {error && <div className="error-message">{error}</div>}

                      {!loading && products.length === 0 && (
                        <div className="empty-state seller-products-empty">
                          <Package size={40} strokeWidth={1.5} />
                          <p>No products yet</p>
                          <span>Add your first bamboo product to start selling</span>
                          <button
                            className="btn-add-product-seller"
                            onClick={() => {
                              setEditingProduct(null)
                              setModalCategory(categories.length > 0 ? categories[0].id : '')
                              setShowProductModal(true)
                            }}
                          >
                            <Plus size={16} /> Add Product
                          </button>
                        </div>
                      )}

                      {!loading && products.length > 0 && (
                        <div className="products-grid-modern seller-products-grid">
                          {products.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              showManagementActions={true}
                              onProductUpdated={fetchProducts}
                              onEditProduct={(productToEdit) => {
                                setEditingProduct(productToEdit)
                                setModalCategory(productToEdit.category || (categories.length > 0 ? categories[0].name.toLowerCase() : ''))
                                setShowProductModal(true)
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {activeView === 'notifications' && (
                  <div className="seller-dashboard-container" style={{ padding: '32px', background: 'transparent', minHeight: 'calc(100vh - 140px)' }}>
                    <div className="admin-page-header">
                      <div className="header-content">
                        <h1>Notifications</h1>
                        <p className="header-subtitle">Alerts and updates from GreenNest</p>
                      </div>
                    </div>

                    <div className="admin-content-area" style={{ padding: 0 }}>
                      {notifications.length === 0 ? (
                        <div className="empty-state" style={{ marginTop: '60px' }}>
                          <AlertTriangle size={48} />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`notification-card ${!notif.isRead ? 'unread' : ''}`}
                              style={{
                                cursor: 'pointer',
                                borderLeftColor: notif.type === 'seller_warning' ? '#F59E0B' : '#43A047'
                              }}
                              onClick={() => !notif.isRead && markNotificationAsRead(notif.id)}
                            >
                              <div
                                className="notification-icon"
                                style={{
                                  color: notif.type === 'seller_warning' ? '#F59E0B' : '#43A047',
                                  background: notif.type === 'seller_warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)'
                                }}
                              >
                                <AlertTriangle size={20} />
                              </div>
                              <div className="notification-content">
                                <h4 className="notification-title">
                                  {notif.type === 'seller_warning' ? 'Warning from Admin' : 'Notification'}
                                </h4>
                                <p className="notification-message">{notif.message}</p>
                                {notif.createdAt?.toDate && (
                                  <span className="notification-order">
                                    {notif.createdAt.toDate().toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeView === 'messages' && (
                  <div className="seller-dashboard-container" style={{ padding: '32px', background: 'transparent', minHeight: 'calc(100vh - 140px)' }}>
                    <Chat />
                  </div>
                )}
              </div>
            </main>
          </div>

          <ProductModal
            isOpen={showProductModal}
            category={modalCategory}
            editingProduct={editingProduct}
            onClose={() => {
              setShowProductModal(false)
              setEditingProduct(null)
              setModalCategory(null)
            }}
            onProductAdded={() => fetchProducts()}
          />

          {/* Delivery Message Modal */}
          {showDeliveryModal && (
            <div className="modal-overlay" onClick={() => setShowDeliveryModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                  <h3>Add Delivery Message</h3>
                  <button className="modal-close" onClick={() => setShowDeliveryModal(false)}>×</button>
                </div>
                <div className="modal-body" style={{ padding: '24px' }}>
                  <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
                    Send a personalized message to the buyer about their delivery:
                  </p>
                  <textarea
                    value={deliveryMessage}
                    onChange={(e) => setDeliveryMessage(e.target.value)}
                    placeholder="e.g., We are going to deliver your items today at 2 PM!"
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                      onClick={() => setShowDeliveryModal(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelivery}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'var(--primary-green)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Mark as Delivered
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}
    </>
  )
}
