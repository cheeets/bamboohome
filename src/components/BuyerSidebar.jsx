import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import {
  LogOut,
  Menu,
  MessageCircle,
  Package,
  ShoppingBag,
  ShoppingCart,
  User,
} from 'lucide-react'
import '../css/BuyerLayout.css'

const NAV_ITEMS = [
  { id: 'shop', path: '/shop', label: 'Shop', icon: ShoppingBag },
  { id: 'profile', path: '/profile', label: 'My Profile', icon: User },
  { id: 'orders', path: '/orders', label: 'My Orders', icon: Package, badgeKey: 'orders' },
  { id: 'messages', path: '/chat', label: 'Messages', icon: MessageCircle, badgeKey: 'messages' },
  { id: 'cart', path: '/cart', label: 'Cart', icon: ShoppingCart, badgeKey: 'cart' },
]

export default function BuyerSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, userName } = useAuth()
  const { getCartItemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [activeOrders, setActiveOrders] = useState(0)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadCount = snapshot.docs.filter((doc) => {
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
      const active = snapshot.docs.filter((doc) => {
        const status = (doc.data().status || '').toLowerCase()
        return status === 'pending' || status === 'processing' || status === 'shipped'
      }).length
      setActiveOrders(active)
    })
    return () => unsubscribe()
  }, [user])

  const getBadge = (key) => {
    if (key === 'orders') return activeOrders
    if (key === 'messages') return unreadMessages
    if (key === 'cart') return getCartItemCount()
    return 0
  }

  const isActive = (path) => location.pathname === path

  const initials = (userName || user?.email || 'U').charAt(0).toUpperCase()

  return (
    <>
      <button
        type="button"
        className="buyer-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div
        className={`buyer-sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`buyer-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="buyer-profile-card">
          <div className="buyer-avatar">{initials}</div>
          <p className="buyer-profile-name">{userName || 'My Account'}</p>
          <p className="buyer-profile-email">{user?.email}</p>
          <button type="button" className="buyer-edit-profile" onClick={() => navigate('/profile')}>
            Edit Profile
          </button>
        </div>

        <nav className="buyer-sidebar-nav">
          {NAV_ITEMS.map(({ id, path, label, icon: Icon, badgeKey }) => {
            const badge = badgeKey ? getBadge(badgeKey) : 0
            return (
              <Link
                key={id}
                to={path}
                className={`buyer-nav-item ${isActive(path) ? 'active' : ''}`}
              >
                <Icon size={18} />
                {label}
                {badge > 0 && <span className="buyer-nav-badge">{badge}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="buyer-sidebar-footer">
          <button
            type="button"
            className="buyer-nav-item"
            onClick={async () => {
              try {
                await logout()
                navigate('/')
              } catch (error) {
                console.error('Logout error:', error)
              }
            }}
            style={{ width: '100%', color: 'var(--danger-color)' }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
