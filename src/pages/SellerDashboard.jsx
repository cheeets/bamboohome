import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { ProductCard } from '../components/ProductCard'
import { ProductModal } from '../components/ProductModal'
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
import '../css/ShopPage.css'
import '../css/SellerDashboard.css'
import '../css/AdminDashboardLayout.css'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('month')

  const [showProductModal, setShowProductModal] = useState(false)
  const [modalCategory, setModalCategory] = useState('chair')
  const [editingProduct, setEditingProduct] = useState(null)
  const [ordersWithDetails, setOrdersWithDetails] = useState([])
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false)

  const [activeView, setActiveView] = useState('analytics')
  const [activeSubView, setActiveSubView] = useState('analytics-overview')

  // Real-time products listener for inventory monitoring
  useEffect(() => {
    if (!user) return

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
    try {
      const orderRef = doc(db, 'orders', orderId)
      await updateDoc(orderRef, { status: newStatus })
      console.log(`✓ Order ${orderId} updated to ${newStatus}`)
    } catch (err) {
      console.error('Error updating order status:', err)
    }
  }

  const handleViewDetails = (order) => {
    // Order details removed
  }

  const handleCloseDetails = () => {
    // Order details removed
  }

  const getSalesStats = () => {
    const productMap = {}
    const salesByProduct = {}
    let totalRevenue = 0
    let totalOrders = orders.length

    orders.forEach((order) => {
      if (order.status === 'Delivered' || order.status === 'Completed') {
        totalRevenue += order.totalAmount || 0
        ;(order.products || order.items || []).forEach((item) => {
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
      if (order.status !== 'Delivered' && order.status !== 'Completed') return
      
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

  // AI Inventory Logic
  const inventoryStats = useMemo(() => {
    const lowStock = products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 5) && (p.stock || 0) > 0)
    const outOfStock = products.filter(p => (p.stock || 0) <= 0)
    
    // AI Suggestions based on sales trends and current stock
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
            return `${label}: ₱${value.toFixed(2)} (${percentage}%)`
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

  const canManage = useMemo(() => userRole === 'seller', [userRole])

  // Filter pending orders
  const pendingOrders = ordersWithDetails.filter(order => 
    order.status === 'Pending'
  )

  // Filter processing and completed orders
  const processingOrders = ordersWithDetails.filter(order => 
    order.status === 'Processing' || order.status === 'Shipped'
  )

  const completedOrders = ordersWithDetails.filter(order => 
    order.status === 'Completed' || order.status === 'Delivered'
  )

  return (
    <div className="admin-dashboard-layout">
      <SellerSidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
      />
      
      <main className="admin-main-content">
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
              <span className="stat-value">₱{totalRevenue.toFixed(2)}</span>
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
                    <div className="metric-icon">💰</div>
                    <div className="metric-content">
                      <h3>Total Revenue</h3>
                      <p className="metric-value">₱{totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">📦</div>
                    <div className="metric-content">
                      <h3>Completed Orders</h3>
                      <p className="metric-value">{totalOrders}</p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">🛍️</div>
                    <div className="metric-content">
                      <h3>Active Products</h3>
                      <p className="metric-value">{products.length}</p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">⭐</div>
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
                            <td>₱{data.revenue.toFixed(2)}</td>
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
              <section className="inventory-ai-section">
                <div className="ai-assistant-header">
                  <div className="ai-title">
                    <span className="ai-icon">🤖</span>
                    <h2>AI Inventory Assistant</h2>
                  </div>
                  <div className="ai-status">
                    <span className="pulse-dot"></span>
                    Real-time Monitoring Active
                  </div>
                </div>

                {/* AI Insights & Suggestions */}
                <div className="ai-suggestions-grid">
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
                    <div className="suggestion-card low">
                      <p>AI Assistant: All stock levels look healthy based on current trends. Great job!</p>
                    </div>
                  )}
                </div>

                <div className="inventory-overview-grid">
                  {/* Out of Stock Card */}
                  <div className={`inventory-card ${inventoryStats.outOfStock.length > 0 ? 'critical' : ''}`}>
                    <h3>Out of Stock</h3>
                    <div className="inventory-num">{inventoryStats.outOfStock.length}</div>
                    <p>Products currently unavailable to buyers</p>
                  </div>

                  {/* Low Stock Card */}
                  <div className={`inventory-card ${inventoryStats.lowStock.length > 0 ? 'warning' : ''}`}>
                    <h3>Low Stock Warnings</h3>
                    <div className="inventory-num">{inventoryStats.lowStock.length}</div>
                    <p>Products nearing threshold</p>
                  </div>

                  {/* Total Inventory Card */}
                  <div className="inventory-card">
                    <h3>Total Items in Stock</h3>
                    <div className="inventory-num">
                      {products.reduce((acc, p) => acc + (p.stock || 0), 0)}
                    </div>
                    <p>Total units across all products</p>
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
                                <span>{product.name}</span>
                              </div>
                            </td>
                            <td>{product.category}</td>
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
                                ✏️ Update Stock
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
                  <span className="summary-icon">📋</span>
                  <div className="summary-info">
                    <h3>Pending</h3>
                    <p>{pendingOrders.length} Orders</p>
                  </div>
                </div>
                <div className="summary-card processing">
                  <span className="summary-icon">🚚</span>
                  <div className="summary-info">
                    <h3>Processing</h3>
                    <p>{processingOrders.length} Orders</p>
                  </div>
                </div>
              </div>

              {/* Pending Orders Section */}
              <section className="orders-section-card">
                <div className="section-header">
                  <h2>📋 Pending Orders</h2>
                </div>

                {loadingOrderDetails && <div className="loading">Loading order details...</div>}

                {!loadingOrderDetails && pendingOrders.length === 0 && (
                  <div className="empty-state">
                    <p>No pending orders yet. Great job keeping up! 🎉</p>
                  </div>
                )}

                {!loadingOrderDetails && pendingOrders.length > 0 && (
                  <div className="orders-table-wrapper">
                    <table className="pending-orders-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Buyer Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th>Products</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingOrders.map((order) => (
                          <tr key={order.id} className="order-row">
                            <td className="order-id">{order.id.slice(0, 8)}...</td>
                            <td className="buyer-name">{order.buyerName}</td>
                            <td className="buyer-email">{order.buyerEmail}</td>
                            <td className="phone">{order.address?.phoneNumber || 'N/A'}</td>
                            <td className="address">{order.address?.addressLine || 'N/A'}</td>
                            <td className="products-count">{(order.products || order.items || []).length} item(s)</td>
                            <td className="total">₱{(order.totalAmount || 0).toFixed(2)}</td>
                            <td className="action-cell">
                              <button
                                className="btn-accept"
                                onClick={() => updateOrderStatus(order.id, 'Processing')}
                                title="Mark as Processing"
                              >
                                ✓ Process
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Processing Orders Section */}
              {processingOrders.length > 0 && (
                <section className="orders-section-card" style={{ marginTop: '30px' }}>
                  <div className="section-header">
                    <h2>🚚 Processing Orders</h2>
                  </div>

                  <div className="orders-table-wrapper">
                    <table className="pending-orders-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Buyer Name</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processingOrders.map((order) => (
                          <tr key={order.id} className="order-row">
                            <td className="order-id">{order.id.slice(0, 8)}...</td>
                            <td className="buyer-name">{order.buyerName}</td>
                            <td className="status-cell">
                              <span className={`status-badge status-${order.status?.toLowerCase()}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="total">₱{(order.totalAmount || 0).toFixed(2)}</td>
                            <td className="action-cell">
                              <button
                                className="btn-complete"
                                onClick={() => updateOrderStatus(order.id, 'Delivered')}
                                title="Mark as Delivered"
                              >
                                ✓ Delivered
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeView === 'products' && (
            <div className="seller-dashboard-container" style={{ padding: 0, background: 'none' }}>
              {/* My Products Section */}
              <section className="products-section-modern" style={{ maxWidth: '100%', margin: 0 }}>
                <div className="dashboard-header">
                  <h2>📦 My Products</h2>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="product-count">{products.length} products</span>
                    <button
                      onClick={() => {
                        setEditingProduct(null)
                        setModalCategory('chair')
                        setShowProductModal(true)
                      }}
                      className="btn-add-product-seller"
                      title="Add New Product"
                    >
                      + Add Product
                    </button>
                  </div>
                </div>

                {loading && <div className="loading">Loading...</div>}
                {error && <div className="error-message">{error}</div>}

                {!loading && products.length === 0 && (
                  <div className="empty-state">
                    <p>No products yet. Click "Add Product" to get started! 🚀</p>
                  </div>
                )}

                {!loading && products.length > 0 && (
                  <div className="products-grid-modern">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        showManagementActions={true}
                        onProductUpdated={fetchProducts}
                        onEditProduct={(productToEdit) => {
                          setEditingProduct(productToEdit)
                          setModalCategory(productToEdit.category || 'chair')
                          setShowProductModal(true)
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeView === 'messages' && (
            <div className="seller-dashboard-container" style={{ padding: 0, background: 'none' }}>
              {/* Messages with Buyers Section */}
              <section className="messaging-section" style={{ maxWidth: '100%', margin: 0 }}>
                <div className="dashboard-header">
                  <h2>💬 Messages with Buyers</h2>
                </div>
                <div className="messaging-card">
                  <p className="messaging-description">Keep in touch with your customers and respond to their inquiries.</p>
                  <button
                    onClick={() => navigate('/messages')}
                    className="btn-open-chat"
                  >
                    Open Chat Window
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

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
    </div>
  )
}


