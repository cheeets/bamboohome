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
  const { user, userRole } = useAuth()

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
      alert(`Failed to update order status: ${err.message}`)
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
    } catch (err) {
      console.error('Error updating order status:', err)
      alert(`Failed to update order status: ${err.message}`)
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
      if (normalizedStatus !== 'delivered' && normalizedStatus !== 'completed') return
      
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
        if (!grouped[key]) grouped[key] = 0
        grouped[key]++
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
        label: 'Completed Orders',
        data: analyticsData.map(([, count]) => count),
        backgroundColor: '#4CAF50',
        borderColor: '#45a049',
        borderWidth: 1,
      },
    ],
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Sales Trend (${analyticsTimeframe === 'week' ? 'Last 30 Days' : analyticsTimeframe === 'month' ? 'Last 12 Months' : 'By Year'})`,
        font: { size: 14, weight: 'bold' },
      },
    },
    scales: { y: { beginAtZero: true } },
  }

  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8)

  const pieChartData = {
    labels: topProducts.map(([name]) => name),
    datasets: [
      {
        data: topProducts.map(([, data]) => data.revenue),
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#FFEB3B', '#795548'],
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right',
        labels: { font: { size: 12 }, padding: 15 },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || ''
            const value = context.parsed
            const percentage = ((value / totalRevenue) * 100).toFixed(1)
            return `${label}: ${formatPrice(value)} (${percentage}%)`
          },
        },
      },
      title: { display: true, text: 'Revenue by Product', font: { size: 14, weight: 'bold' } },
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
              <span className="stat-value">{formatPrice(totalRevenue)}</span>
              <span className="stat-label">Revenue</span>
            </div>
            <div className="quick-stat">
              <span className="stat-value">{totalOrders}</span>
              <span className="stat-label">Orders</span>
            </div>
            <div className="quick-stat">
              <span className="stat-value">{products.length}</span>
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
                  <h2>Sales Analytics</h2>
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
                    <div className="metric-icon">₱</div>
                    <div className="metric-content">
                      <h3>Total Revenue</h3>
                      <p className="metric-value">{formatPrice(totalRevenue)}</p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon"><Package size={22} /></div>
                    <div className="metric-content">
                      <h3>Completed Orders</h3>
                      <p className="metric-value">{totalOrders}</p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon"><ShoppingBag size={22} /></div>
                    <div className="metric-content">
                      <h3>Active Products</h3>
                      <p className="metric-value">{products.length}</p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon"><BarChart3 size={22} /></div>
                    <div className="metric-content">
                      <h3>Top Product</h3>
                      <p className="metric-value">{topProducts.length > 0 ? topProducts[0][0] : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                  <div className="chart-container">
                    <Bar data={barChartData} options={barChartOptions} />
                  </div>
                  <div className="chart-container">
                    {topProducts.length > 0 ? (
                      <Pie data={pieChartData} options={pieChartOptions} />
                    ) : (
                      <div className="empty-chart">No sales data available</div>
                    )}
                  </div>
                </div>

                {/* Top Products Table */}
                {topProducts.length > 0 && (
                  <div className="top-products-section">
                    <h3>Top Performing Products</h3>
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Units Sold</th>
                          <th>Revenue</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map(([name, data], index) => (
                          <tr key={index}>
                            <td>{name}</td>
                            <td>{data.quantity}</td>
                            <td>{formatPrice(data.revenue)}</td>
                            <td>{((data.revenue / totalRevenue) * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
  )
}
