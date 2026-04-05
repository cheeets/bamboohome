import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import '../css/AdminSidebar.css' // Reusing the same sidebar styles

export default function SellerSidebar({ activeView, setActiveView }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)
  const { user, logout, storeName } = useAuth()
  const navigate = useNavigate()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Listen for unread messages
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadCount = snapshot.docs.filter(doc => {
        const data = doc.data()
        const isUnread = data.isRead !== true
        const isNotMe = (data.sender || data.senderId) !== user.uid
        return isUnread && isNotMe
      }).length
      setUnreadMessages(unreadCount)
    })

    return () => unsubscribe()
  }, [user])

  // Listen for pending orders
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'orders'),
      where('sellerId', '==', user.uid),
      where('status', '==', 'Pending')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrders(snapshot.size)
    })

    return () => unsubscribe()
  }, [user])

  // Listen for low stock products
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'products'),
      where('sellerId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lowStock = snapshot.docs.filter(doc => {
        const data = doc.data()
        const stock = data.stock || 0
        const threshold = data.lowStockThreshold || 5
        return stock <= threshold
      }).length
      setLowStockCount(lowStock)
    })

    return () => unsubscribe()
  }, [user])

  const menuItems = [
    {
      label: 'Analytics',
      id: 'analytics',
      icon: '📊',
    },
    {
      label: 'Inventory',
      id: 'inventory',
      icon: '📦',
      badge: lowStockCount,
    },
    {
      label: 'Orders',
      id: 'orders',
      icon: '🛒',
      badge: pendingOrders,
    },
    {
      label: 'Products',
      id: 'products',
      icon: '🛍️',
    },
    {
      label: 'Messages',
      id: 'messages',
      icon: '💬',
      badge: unreadMessages,
    },
  ]

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={() => navigate('/seller/dashboard')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🍃</span>
            <div className="logo-text">
              <h2>{storeName || 'GreenNest'}</h2>
              <p>Seller Dashboard</p>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.id} className="menu-group">
              <button
                className={`menu-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
                {item.badge > 0 && <span className="notif-badge">{item.badge}</span>}
              </button>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <p className="user-role">Seller</p>
              <p className="user-status">Online</p>
            </div>
          </div>
          <button className="view-shop-btn" onClick={() => navigate('/shop')}>
            🛒 View Shop
          </button>
          <button
            className="logout-btn"
            onClick={async () => {
              try {
                await logout()
                navigate('/')
              } catch (error) {
                console.error('Logout error:', error)
              }
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>
    </>
  )
}
