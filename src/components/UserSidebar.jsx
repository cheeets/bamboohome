import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { LogOut, Menu, MessageCircle, Package, ShoppingBag, User } from 'lucide-react'
import '../css/AdminSidebar.css'

export default function UserSidebar({ activeView, setActiveView }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024)
  const { user, logout, userName } = useAuth()
  const navigate = useNavigate()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [activeOrders, setActiveOrders] = useState(0)

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
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const active = snapshot.docs.filter(doc => {
        const status = (doc.data().status || '').toLowerCase()
        return status === 'pending' || status === 'processing' || status === 'shipped'
      }).length
      setActiveOrders(active)
    })
    return () => unsubscribe()
  }, [user])

  return (
    <>
      <button className="sidebar-toggle-admin" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu size={18} />
      </button>

      {sidebarOpen && window.innerWidth <= 1024 && (
        <div className="sidebar-overlay-admin" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <h2>{userName || 'GreenNest'}</h2>
            <span className="admin-badge">My Account</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="nav-label">Account</span>
            <button className={`nav-item ${activeView === 'profile' ? 'active' : ''}`} onClick={() => setActiveView('profile')}>
              <User size={16} /> My Profile
            </button>
            <button className={`nav-item ${activeView === 'orders' ? 'active' : ''}`} onClick={() => navigate('/orders')}>
              <Package size={16} /> My Orders
              {activeOrders > 0 && <span className="notif-badge">{activeOrders}</span>}
            </button>
            <button className={`nav-item ${activeView === 'messages' ? 'active' : ''}`} onClick={() => navigate('/chat')}>
              <MessageCircle size={16} /> Messages
              {unreadMessages > 0 && <span className="notif-badge">{unreadMessages}</span>}
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="view-shop-btn" onClick={() => navigate('/shop')}>
            <ShoppingBag size={14} /> Back to Shop
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
    </>
  )
}
