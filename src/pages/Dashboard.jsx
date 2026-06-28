import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore'
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
import { Edit, Trash2, Store } from 'lucide-react'
import { ProductModal } from '../components/ProductModal'
import AdminSidebar from '../components/AdminSidebar'
import { formatPrice } from '../utils/rating'
import '../css/AdminOrdersDashboard.css'
import '../css/AdminDashboardLayout.css'
import '../css/DashboardTheme.css'
import AdminOrders from '../components/AdminOrders'
import AdminUsersDashboard from '../components/AdminUsersDashboard'
import AdminSellerStoreView from '../components/AdminSellerStoreView'
import AdminProductsDashboard from '../components/AdminProductsDashboard'
import AdminCategoriesDashboard from '../components/AdminCategoriesDashboard'
import AdminSellerPerformance from '../components/AdminSellerPerformance'
import AdminReports from '../components/AdminReports'

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
  const [editingProduct, setEditingProduct] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

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

      setAllOrders(prevOrders =>
        prevOrders.map((order) =>
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
      if (!window.confirm('Are you sure you want to delete this user?')) return;
      
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        deleted: true,
        deletedAt: new Date(),
      })

      setAllUsers(prev => prev.filter((user) => user.id !== userId))
      alert('User deleted successfully')
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Failed to delete user: ' + err.message)
    }
  }

  const handleChangeRole = async (userId, newRole) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
      })

      setAllUsers(prev => 
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      )
      alert(`User role updated to ${newRole}`)
    } catch (err) {
      console.error('Error updating user role:', err)
      alert('Failed to update user role: ' + err.message)
    }
  }

  const handleSuspendUser = async (userId, reason) => {
    console.log('🔴 handleSuspendUser called with:', { userId, reason })
    try {
      const userRef = doc(db, 'users', userId)
      console.log('📝 Updating Firestore document for user:', userId)
      await updateDoc(userRef, {
        isSuspended: true,
        suspensionReason: reason || 'No reason provided',
        suspendedAt: new Date(),
        updatedAt: new Date(),
      })

      setAllUsers(prev =>
        prev.map((user) =>
          user.id === userId ? {
            ...user,
            isSuspended: true,
            suspensionReason: reason || 'No reason provided',
            suspendedAt: new Date()
          } : user
        )
      )

      // Send notification to the seller
      const user = allUsers.find(u => u.id === userId)
      if (user) {
        console.log('📨 Sending notification to suspended seller:', user.email)
        const notificationData = {
          userId,
          message: `Your seller account has been suspended. Reason: ${reason || 'No reason provided'}`,
          type: 'seller_warning',
          isRead: false,
          createdAt: serverTimestamp(),
        }
        await addDoc(collection(db, 'notifications'), notificationData)
      }

      alert('Seller suspended successfully')
    } catch (err) {
      console.error('❌ Error suspending user:', err)
      alert('Failed to suspend seller: ' + err.message)
    }
  }

  const handleUnsuspendUser = async (userId) => {
    console.log('🟢 handleUnsuspendUser called with:', { userId })
    try {
      const userRef = doc(db, 'users', userId)
      console.log('📝 Updating Firestore document for user:', userId)
      await updateDoc(userRef, {
        isSuspended: false,
        suspensionReason: null,
        suspendedAt: null,
        updatedAt: new Date(),
      })

      setAllUsers(prev =>
        prev.map((user) =>
          user.id === userId ? {
            ...user,
            isSuspended: false,
            suspensionReason: null,
            suspendedAt: null
          } : user
        )
      )

      // Send notification to the seller
      const user = allUsers.find(u => u.id === userId)
      if (user) {
        console.log('📨 Sending notification to unsuspended seller:', user.email)
        const notificationData = {
          userId,
          message: 'Your seller account has been unsuspended.',
          type: 'order_update',
          isRead: false,
          createdAt: serverTimestamp(),
        }
        await addDoc(collection(db, 'notifications'), notificationData)
      }

      alert('Seller unsuspended successfully')
    } catch (err) {
      console.error('❌ Error unsuspending user:', err)
      alert('Failed to unsuspend seller: ' + err.message)
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
      
      setAllProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === productId ? { ...p, stock: parseInt(newStock) || 0 } : p
        )
      )
      alert('Stock updated successfully')
    } catch (err) {
      console.error('Error updating stock:', err)
      alert('Failed to update stock')
    }
  }

  const handleAdminDeleteProduct = async (productId) => {
    try {
      const productRef = doc(db, 'products', productId)
      await deleteDoc(productRef)
      setAllProducts(prev => prev.filter(p => p.id !== productId))
      alert('Product deleted successfully')
    } catch (err) {
      console.error('Error deleting product:', err)
      alert('Failed to delete product: ' + err.message)
    }
  }

  const handleAdminEditProduct = (productId, productData) => {
    setEditingProduct(productData)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingProduct(null)
    fetchAllProducts() // Refresh after edit
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

  const analyticsData = React.useMemo(() => getOrdersByTimeframe(), [allOrders, analyticsTimeframe])

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

  const { productMap, totalProducts } = React.useMemo(() => getProductStats(), [allOrders])

  const barChartData = React.useMemo(() => ({
    labels: analyticsData.map(([period]) => period),
    datasets: [
      {
        label: 'Total Orders',
        data: analyticsData.map(([, data]) => data.total),
        borderColor: '#2E7D32',
        backgroundColor: 'rgba(46, 125, 50, 0.08)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#2E7D32',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Completed',
        data: analyticsData.map(([, data]) => data.completed),
        borderColor: '#43A047',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#43A047',
        tension: 0.35,
        fill: false,
      },
      {
        label: 'Pending',
        data: analyticsData.map(([, data]) => data.pending),
        borderColor: '#F57C00',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#F57C00',
        tension: 0.35,
        fill: false,
      },
    ],
  }), [analyticsData])

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          padding: 14,
          font: { size: 12, family: 'Inter' },
          usePointStyle: true,
        },
      },
      title: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: { size: 11 },
          maxTicksLimit: 12,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: 11 },
          precision: 0,
        },
        grid: { color: 'rgba(0, 0, 0, 0.06)' },
      },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
  }

  const pieChartData = React.useMemo(() => ({ labels: Object.keys(productMap), datasets: [{ data: Object.values(productMap), backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'], borderColor: '#fff', borderWidth: 2 }] }), [productMap])

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
        <div className="dashboard-shell-inner">
          <AdminSidebar activeView={activeView} setActiveView={setActiveView} activeSubView={activeSubView} setActiveSubView={setActiveSubView} />
          <main className="admin-main-content dashboard-main-panel">
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
      </div>
    )
  }

  const renderViewHeader = (title, subtitle) => (
    <div className="dashboard-hero">
      <div className="hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  )

  return (
    <div className="admin-dashboard-layout">
      <div className="dashboard-shell-inner">
        <AdminSidebar
          activeView={activeView}
          setActiveView={setActiveView}
          activeSubView={activeSubView}
          setActiveSubView={setActiveSubView}
        />

        <main className="admin-main-content dashboard-main-panel">
          <div className="admin-content-area">
          {activeView === 'analytics' && (
            <>
              {renderViewHeader('Platform Analytics', 'Monitor platform-wide sales and growth')}
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
            </>
          )}

          {activeView === 'users' && (
            <>
              {renderViewHeader('User Management', 'Manage platform members and permissions')}
              <AdminUsersDashboard
                loading={loading}
                error={error}
                allUsers={allUsers.filter(u => !u.deleted)}
                stats={userStats}
                filterRole={filterRole}
                setFilterRole={setFilterRole}
                handleDeleteUser={handleDeleteUser}
                handleChangeRole={handleChangeRole}
                handleSuspendUser={handleSuspendUser}
                handleUnsuspendUser={handleUnsuspendUser}
                formatDate={formatDate}
                activeSubView={activeSubView}
                onViewStore={handleViewStore}
              />
            </>
          )}

          {activeView === 'seller-performance' && (
            <AdminSellerPerformance />
          )}

          {activeView === 'categories' && (
            <AdminCategoriesDashboard />
          )}

          {activeView === 'seller-store' && selectedSeller && (
            <>
              {renderViewHeader(selectedSeller.storeName || 'Seller Store', `Moderating products for ${selectedSeller.email}`)}
              <AdminSellerStoreView 
                seller={selectedSeller} 
                onBack={() => setActiveView('users')} 
              />
            </>
          )}

          {activeView === 'products' && (
            <>
              {renderViewHeader('Product Moderation', 'Review and manage catalog items')}
              <AdminProductsDashboard
                allProducts={allProducts}
                onDeleteProduct={handleAdminDeleteProduct}
                onUpdateStock={handleAdminUpdateStock}
                onEditProduct={handleAdminEditProduct}
              />
            </>
          )}

          {activeView === 'inventory' && (
            <div className="admin-inventory-container">
              {activeSubView === 'inventory-overview' && (
                <>
                  {renderViewHeader('Global Inventory', `Monitoring ${allProducts.filter(p => !p.deleted).length} products across all sellers`)}
                  <div className="products-grid-container" style={{ padding: '24px' }}>
                    <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                      {allProducts.filter(p => !p.deleted).map(product => {
                        const isOutOfStock = (product.stock || 0) <= 0
                        const isLowStock = (product.stock || 0) <= (product.lowStockThreshold || 5)
                        return (
                          <div key={product.id} className="product-card" style={{ 
                            background: '#fff', 
                            borderRadius: '12px', 
                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)', 
                            overflow: 'hidden',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}>
                            <div className="product-image-container" style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: '#f5f5f5' }}>
                              <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{
                                position: 'absolute', top: '8px', right: '8px',
                                padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600',
                                background: isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#10B981',
                                color: '#fff'
                              }}>
                                {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy'}
                              </div>
                            </div>
                            <div className="product-info" style={{ padding: '16px' }}>
                              <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 8px 0', color: '#1f2937' }}>{product.name}</h3>
                              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0' }}>Seller: {product.storeName || 'N/A'}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>{formatPrice(product.price)}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Stock:</span>
                                  <input 
                                    type="number" 
                                    defaultValue={product.stock} 
                                    style={{ 
                                      width: '60px', 
                                      padding: '4px 8px', 
                                      border: '1px solid #e5e7eb', 
                                      borderRadius: '6px', 
                                      fontSize: '13px',
                                      textAlign: 'center'
                                    }}
                                    onBlur={(e) => handleAdminUpdateStock(product.id, e.target.value)}
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  style={{ 
                                    flex: 1, 
                                    padding: '8px 12px', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    background: '#3b82f6', 
                                    color: '#fff', 
                                    fontSize: '13px', 
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleAdminEditProduct(product.id, product)}
                                >
                                  Edit
                                </button>
                                <button 
                                  style={{ 
                                    padding: '8px 12px', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    background: '#EF4444', 
                                    color: '#fff', 
                                    fontSize: '13px', 
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleAdminDeleteProduct(product.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeSubView === 'low-stock-alerts' && (
                <>
                  {renderViewHeader('Low Stock Alerts', 'Items requiring immediate attention')}
                  <div style={{ padding: '24px' }}>
                    {allProducts.filter(p => !p.deleted && (p.stock || 0) <= (p.lowStockThreshold || 5)).length > 0 ? (
                      <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                        {allProducts.filter(p => !p.deleted && (p.stock || 0) <= (p.lowStockThreshold || 5)).map(product => {
                          const isOutOfStock = (product.stock || 0) <= 0
                          return (
                            <div key={product.id} style={{ 
                              background: isOutOfStock ? '#fef2f2' : '#fffbeb', 
                              borderRadius: '12px', 
                              boxShadow: '0 2px 12px rgba(0,0,0,0.08)', 
                              overflow: 'hidden',
                              padding: '20px'
                            }}>
                              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: isOutOfStock ? '#991B1B' : '#92400E' }}>
                                {product.name}
                              </h3>
                              <p style={{ fontSize: '14px', color: isOutOfStock ? '#dc2626' : '#d97706', margin: '0 0 12px 0' }}>
                                Seller: {product.storeName}
                              </p>
                              <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 16px 0' }}>
                                Current Stock: <strong>{product.stock || 0}</strong> (Threshold: {product.lowStockThreshold || 5})
                              </p>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  style={{ 
                                    flex: 1, 
                                    padding: '8px 12px', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    background: isOutOfStock ? '#EF4444' : '#F59E0B', 
                                    color: '#fff', 
                                    fontSize: '13px', 
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleAdminEditProduct(product.id, product)}
                                >
                                  Update Stock
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '60px 20px', 
                        background: '#fff', 
                        borderRadius: '12px', 
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)' 
                      }}>
                        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>🎉 All products are well-stocked!</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeView === 'reports' && (
            <>
              {renderViewHeader('Store Reports', 'Review and manage user-submitted store reports')}
              <AdminReports />
            </>
          )}
        </div>
        </main>
      </div>

      {showEditModal && editingProduct && (
        <ProductModal
          isOpen={showEditModal}
          editingProduct={editingProduct}
          category={editingProduct.category}
          onClose={handleCloseEditModal}
          onProductAdded={handleCloseEditModal}
        />
      )}
    </div>
  )
}
