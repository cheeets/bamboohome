import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { BarChart3, LogOut, Menu, MessageCircle, Package, ShoppingBag, ShoppingCart, Store, User } from 'lucide-react'
import '../css/AdminSidebar.css'

export default function SellerSidebar({ activeView, setActiveView }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024)
  const { user, logout, storeName } = useAuth()
  const navigate = useNavigate()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadCount = snapshot.docs.filter(doc => {
        const data = doc.data()
        return data.isRead !== true && (data.sender || data.senderId) !== user.uid
      }).length
      setUnreadMessages(unreadCount)
    })
    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'orders'), where('sellerId', '==', user.uid), where('status', '==', 'Pending'))
    const unsubscribe = onSnapshot(q, (snapshot) => setPendingOrders(snapshot.size))
    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'products'), where('sellerId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lowStock = snapshot.docs.filter(doc => {
        const data = doc.data()
        return (data.stock || 0) <= (data.lowStockThreshold || 5)
      }).length
      setLowStockCount(lowStock)
    })
    return () => unsubscribe()
  }, [user])

  return (
    <div className="dashboard-sidebar-slot">
      <button className="sidebar-toggle-admin" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu size={18} />
      </button>

      {sidebarOpen && window.innerWidth <= 1024 && (
        <div className="sidebar-overlay-admin" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container" onClick={() => navigate('/seller/dashboard')} style={{ cursor: 'pointer' }}>
            <h2>{storeName || 'GreenNest'}</h2>
            <span className="admin-badge">Seller Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="nav-label">Business</span>
            <button className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveView('analytics'); window.scrollTo(0, 0) }}>
              <BarChart3 size={16} /> Analytics
            </button>
            <button className={`nav-item ${activeView === 'orders' ? 'active' : ''}`} onClick={() => { setActiveView('orders'); window.scrollTo(0, 0) }}>
              <ShoppingCart size={16} /> Orders
              {pendingOrders > 0 && <span className="notif-badge">{pendingOrders}</span>}
            </button>
          </div>

          <div className="nav-group">
            <span className="nav-label">Catalog</span>
            <button className={`nav-item ${activeView === 'inventory' ? 'active' : ''}`} onClick={() => { setActiveView('inventory'); window.scrollTo(0, 0) }}>
              <Package size={16} /> Inventory
              {lowStockCount > 0 && <span className="notif-badge">{lowStockCount}</span>}
            </button>
            <button className={`nav-item ${activeView === 'products' ? 'active' : ''}`} onClick={() => { setActiveView('products'); window.scrollTo(0, 0) }}>
              <ShoppingBag size={16} /> Products
            </button>
          </div>

          <div className="nav-group">
            <span className="nav-label">Communication</span>
            <button className={`nav-item ${activeView === 'messages' ? 'active' : ''}`} onClick={() => { setActiveView('messages'); window.scrollTo(0, 0) }}>
              <MessageCircle size={16} /> Messages
              {unreadMessages > 0 && <span className="notif-badge">{unreadMessages}</span>}
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="view-shop-btn" onClick={() => navigate('/shop')}>
            <Store size={14} /> View Shop
          </button>
          <button className="logout-btn" onClick={async () => {
            try {
              await logout()
              navigate('/')
            } catch (error) {
              console.error('Logout error:', error)
            }
          }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
    </div>
  )
}
