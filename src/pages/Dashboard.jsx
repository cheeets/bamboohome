import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement, 
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import AdminSidebar from '../components/AdminSidebar'
import '../css/AdminOrdersDashboard.css'
import '../css/AdminDashboardLayout.css'
import AdminOrders from '../components/AdminOrders'
import AdminUsersDashboard from '../components/AdminUsersDashboard'
import AdminSellerStoreView from '../components/AdminSellerStoreView'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export function AdminOrdersDashboard() {
  const { user, userRole } = useAuth()
  const navigate = useNavigate()
  const [allOrders, setAllOrders] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('month')
  const [activeView, setActiveView] = useState('analytics')
  const [activeSubView, setActiveSubView] = useState('sales-analytics')
  const [selectedSeller, setSelectedSeller] = useState(null)

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/')
      return
    }

    fetchAllOrders()
    fetchAllUsers()
    fetchAllProducts()
  }, [user, userRole, navigate])

  const fetchAllOrders = async () => {
    try {
      setLoading(true)
      // Fetch all orders, sorted by creation date (oldest first - FCFS)
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'))
      const querySnapshot = await getDocs(q)
      const ordersList = []

      querySnapshot.forEach((doc) => {
        ordersList.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setAllOrders(ordersList)
      setError('')
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllProducts = async () => {
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      const productsList = []

      querySnapshot.forEach((doc) => {
        productsList.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setAllProducts(productsList)
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId)
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date(),
      })

      // Update local state
      setAllOrders(
        allOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
    } catch (err) {
      console.error('Error updating order status:', err)
      alert('Failed to update order status. Please try again.')
    }
  }

  const fetchAllUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      const usersList = []

      querySnapshot.forEach((doc) => {
        usersList.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setAllUsers(usersList)
      setError('')
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        deleted: true,
        deletedAt: new Date(),
      })

      // Update local state
      setAllUsers(allUsers.filter((user) => user.id !== userId))
      alert('User deleted successfully')
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Failed to delete user. Please try again.')
    }
  }

  const handleChangeRole = async (userId, newRole) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
      })

      // Update local state
      setAllUsers(
        allUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      )
      alert(
        `User role updated to ${newRole === 'admin' ? 'Admin' : newRole === 'seller' ? 'Seller' : 'Customer'}`,
      )
    } catch (err) {
      console.error('Error updating user role:', err)
      alert('Failed to update user role. Please try again.')
    }
  }

  const handleViewStore = (seller) => {
    setSelectedSeller(seller)
    setActiveView('seller-store')
  }

  const handleAdminUpdateStock = async (productId, newStock) => {
    try {
      const productRef = doc(db, 'products', productId)
      await updateDoc(productRef, {
        stock: parseInt(newStock) || 0,
        updatedAt: new Date(),
      })
      
      setAllProducts(allProducts.map(p => 
        p.id === productId ? { ...p, stock: parseInt(newStock) || 0 } : p
      ))
      alert('Stock updated successfully')
    } catch (err) {
      console.error('Error updating stock:', err)
      alert('Failed to update stock')
    }
  }

  const handleAdminDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    try {
      const productRef = doc(db, 'products', productId)
      await updateDoc(productRef, {
        deleted: true,
        deletedAt: new Date(),
      })
      setAllProducts(allProducts.filter(p => p.id !== productId))
      alert('Product deleted successfully')
    } catch (err) {
      console.error('Error deleting product:', err)
      alert('Failed to delete product')
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

  const getOrdersByTimeframe = () => {
    const now = new Date()
    const grouped = {}

    allOrders.forEach((order) => {
      const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
      let key

      if (analyticsTimeframe === 'day') {
        const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24))
        if (daysAgo <= 30) key = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (analyticsTimeframe === 'week') {
        const weeksAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24 * 7))
        if (weeksAgo <= 12) {
          const weekStart = new Date(orderDate)
          weekStart.setDate(orderDate.getDate() - orderDate.getDay())
          key = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        }
      } else if (analyticsTimeframe === 'month') {
        const monthsAgo = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth())
        if (monthsAgo <= 12) key = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      } else if (analyticsTimeframe === 'year') {
        key = orderDate.getFullYear().toString()
      }

      if (key) {
        if (!grouped[key]) grouped[key] = { total: 0, pending: 0, confirmed: 0, ready_for_pickup: 0, completed: 0, cancelled: 0 }
        grouped[key].total++
        const statusKey = (order.status || '').toString().toLowerCase()
        grouped[key][statusKey] = (grouped[key][statusKey] || 0) + 1
      }
    })

    return Object.entries(grouped).sort()
  }

  const analyticsData = getOrdersByTimeframe()

  const getProductStats = () => {
    const productMap = {}
    let totalProducts = 0

    allOrders.forEach((order) => {
      ;(order.products || order.items || []).forEach((item) => {
        const productName = item.name || 'Unknown Product'
        if (!productMap[productName]) productMap[productName] = 0
        const quantity = item.quantity || 1
        productMap[productName] += quantity
        totalProducts += quantity
      })
    })

    return { productMap, totalProducts }
  }

  const { productMap, totalProducts } = getProductStats()

  const barChartData = {
    labels: analyticsData.map(([period]) => period),
    datasets: [
      { label: 'Total Orders', data: analyticsData.map(([, data]) => data.total), backgroundColor: '#007bff', borderColor: '#0056b3', borderWidth: 1 },
      { label: 'Completed', data: analyticsData.map(([, data]) => data.completed), backgroundColor: '#28a745', borderColor: '#218838', borderWidth: 1 },
      { label: 'Pending', data: analyticsData.map(([, data]) => data.pending), backgroundColor: '#ffc107', borderColor: '#ff9800', borderWidth: 1 },
    ],
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'top' }, title: { display: true, text: `Orders Over Time (${analyticsTimeframe.charAt(0).toUpperCase() + analyticsTimeframe.slice(1)})` } },
    scales: { y: { beginAtZero: true } },
  }

  const pieChartData = { labels: Object.keys(productMap), datasets: [{ data: Object.values(productMap), backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'], borderColor: '#fff', borderWidth: 2 }] }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'right' },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || ''
            const value = context.parsed
            const percentage = ((value / totalProducts) * 100).toFixed(1)
            return `${label}: ${value} (${percentage}%)`
          },
        },
      },
      title: { display: true, text: 'Products Ordered Distribution' },
    },
  }

  const normalizeStatus = (s) => (s || '').toString().toLowerCase()

  const filteredOrders = filterStatus === 'all' ? allOrders : allOrders.filter((o) => normalizeStatus(o.status) === filterStatus)

  const stats = {
    total: allOrders.length,
    pending: allOrders.filter((o) => normalizeStatus(o.status) === 'pending').length,
    confirmed: allOrders.filter((o) => normalizeStatus(o.status) === 'confirmed').length,
    ready_for_pickup: allOrders.filter((o) => normalizeStatus(o.status) === 'ready_for_pickup').length,
    completed: allOrders.filter((o) => normalizeStatus(o.status) === 'completed').length,
    cancelled: allOrders.filter((o) => normalizeStatus(o.status) === 'cancelled').length,
  }

  const userStats = {
    total: allUsers.filter(u => !u.deleted).length,
    customers: allUsers.filter(u => u.role === 'user' && !u.deleted).length,
    admins: allUsers.filter(u => u.role === 'admin' && !u.deleted).length,
    sellers: allUsers.filter(u => u.role === 'seller' && !u.deleted).length,
  }

  const platformStats = {
    totalSales: allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    users: userStats.total,
    sellers: userStats.sellers,
  }

  if (loading && allOrders.length === 0 && allUsers.length === 0) {
    return (
      <div className="admin-dashboard-layout">
        <AdminSidebar activeView={activeView} setActiveView={setActiveView} activeSubView={activeSubView} setActiveSubView={setActiveSubView} />
        <main className="admin-main-content">
          <div className="admin-page-header">
            <div className="header-content">
              <h1>Admin Dashboard</h1>
              <p className="header-subtitle">Loading Platform Data...</p>
            </div>
          </div>
          <div className="admin-content-area" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div className="loading-spinner">Initializing Dashboard...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-dashboard-layout">
      <AdminSidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
        activeSubView={activeSubView}
        setActiveSubView={setActiveSubView}
      />
      
      <main className="admin-main-content">
        {/* Header */}
        <div className="admin-page-header">
          <div className="header-content">
            <h1>Admin Dashboard</h1>
            <p className="header-subtitle">
              {activeView === 'analytics' && 'Platform Analytics & Insights'}
              {activeView === 'users' && 'User Management'}
              {activeView === 'orders' && 'Order Management'}
            </p>
          </div>
          <div className="header-stats">
            <div className="quick-stat">
              <span className="stat-value">{platformStats.totalSales.toFixed(2)}</span>
              <span className="stat-label">Total Sales</span>
            </div>
            <div className="quick-stat">
              <span className="stat-value">{allOrders.length}</span>
              <span className="stat-label">Orders</span>
            </div>
            <div className="quick-stat">
              <span className="stat-value">{userStats.total}</span>
              <span className="stat-label">Users</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="admin-content-area">
          {activeView === 'analytics' && (
            <AdminOrders
              loading={loading}
              error={error}
              filteredOrders={filteredOrders}
              stats={stats}
              platformStats={platformStats}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              updateOrderStatus={updateOrderStatus}
              formatDate={formatDate}
              analyticsTimeframe={analyticsTimeframe}
              setAnalyticsTimeframe={setAnalyticsTimeframe}
              analyticsData={analyticsData}
              productMap={productMap}
              totalProducts={totalProducts}
              barChartData={barChartData}
              barChartOptions={barChartOptions}
              pieChartData={pieChartData}
              pieChartOptions={pieChartOptions}
              activeSubView={activeSubView}
              setActiveSubView={setActiveSubView}
            />
          )}

          {activeView === 'users' && (
            <AdminUsersDashboard
              loading={loading}
              error={error}
              allUsers={allUsers.filter(u => !u.deleted)}
              stats={userStats}
              filterRole={filterRole}
              setFilterRole={setFilterRole}
              handleDeleteUser={handleDeleteUser}
              handleChangeRole={handleChangeRole}
              formatDate={formatDate}
              activeSubView={activeSubView}
              onViewStore={handleViewStore}
            />
          )}

          {activeView === 'seller-store' && selectedSeller && (
            <AdminSellerStoreView 
              seller={selectedSeller} 
              onBack={() => setActiveView('users')} 
            />
          )}

          {activeView === 'inventory' && (
            <div className="admin-inventory-container">
              {activeSubView === 'inventory-overview' && (
                <div className="inventory-grid-admin">
                  <div className="admin-section-header">
                    <h2>Global Inventory Overview</h2>
                    <p>Monitoring {allProducts.length} products across all sellers</p>
                  </div>
                  
                  <div className="admin-inventory-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Seller</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProducts.filter(p => !p.deleted).map(product => {
                          const isOutOfStock = (product.stock || 0) <= 0
                          const isLowStock = (product.stock || 0) <= (product.lowStockThreshold || 5)
                          return (
                            <tr key={product.id}>
                              <td>
                                <div className="product-cell-admin">
                                  <img src={product.imageUrl} alt="" className="mini-thumb" />
                                  <span>{product.name}</span>
                                </div>
                              </td>
                              <td>{product.storeName || 'N/A'}</td>
                              <td>₱{product.price?.toFixed(2)}</td>
                              <td>
                                <input 
                                  type="number" 
                                  defaultValue={product.stock} 
                                  className="admin-stock-input"
                                  onBlur={(e) => handleAdminUpdateStock(product.id, e.target.value)}
                                />
                              </td>
                              <td>
                                <span className={`status-tag ${isOutOfStock ? 'out' : isLowStock ? 'low' : 'ok'}`}>
                                  {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy'}
                                </span>
                              </td>
                              <td>
                                <div className="admin-actions-cell">
                                  <button 
                                    className="btn-admin-delete"
                                    onClick={() => handleAdminDeleteProduct(product.id)}
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSubView === 'low-stock-alerts' && (
                <div className="inventory-grid-admin">
                  <div className="admin-section-header">
                    <h2 className="warning-text">⚠️ Low Stock Alerts</h2>
                    <p>Critical attention needed for these items</p>
                  </div>
                  
                  <div className="alerts-list-admin">
                    {allProducts.filter(p => !p.deleted && (p.stock || 0) <= (p.lowStockThreshold || 5)).length > 0 ? (
                      allProducts.filter(p => !p.deleted && (p.stock || 0) <= (p.lowStockThreshold || 5)).map(product => (
                        <div key={product.id} className={`admin-alert-card ${(product.stock || 0) <= 0 ? 'critical' : 'warning'}`}>
                          <div className="alert-info">
                            <h3>{product.name}</h3>
                            <p>Seller: {product.storeName}</p>
                            <p className="stock-info">Current Stock: <strong>{product.stock || 0}</strong> (Threshold: {product.lowStockThreshold || 5})</p>
                          </div>
                          <div className="alert-actions">
                            <button onClick={() => navigate('/shop')}>View in Shop</button>
                            <button className="primary" onClick={() => {
                              const newStock = prompt('Enter new stock level:', product.stock)
                              if (newStock !== null) handleAdminUpdateStock(product.id, newStock)
                            }}>Update Stock</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-alerts">
                        <p>🎉 All products are well-stocked!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
