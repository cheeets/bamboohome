import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { LoginModal } from './LoginModal'
import { SignupModal } from './SignupModal'
import { ProductModal } from './ProductModal'
import { Bell, Menu, MessageCircle, Search, ShoppingCart, User, X } from 'lucide-react'
import bambooHomeLogo from '../images/bamboo-home-logo.png'
import '../css/Header.css'

export function Header() {
  const { user, userRole, userName, logout } = useAuth()
  const { getCartItemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [modalCategory, setModalCategory] = useState('')
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [headerSearch, setHeaderSearch] = useState('')

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setHeaderSearch(params.get('q') || '')
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!user || userRole !== 'user') {
      setUnreadNotifications(0)
      setNotifications([])
      return
    }

    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifList = []
      let unreadCount = 0
      snapshot.forEach((d) => {
        const data = d.data()
        notifList.push({ id: d.id, ...data })
        if (!data.isRead) unreadCount++
      })
      notifList.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0)
        const bTime = b.createdAt?.toDate?.() || new Date(0)
        return bTime - aTime
      })
      setNotifications(notifList.slice(0, 10))
      setUnreadNotifications(unreadCount)
    })
    return () => unsubscribe()
  }, [user, userRole])

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0)
      return
    }
    const q = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadCount = snapshot.docs.filter((d) => {
        const data = d.data()
        return data.isRead !== true && (data.sender || data.senderId) !== user.uid
      }).length
      setUnreadMessages(unreadCount)
    })
    return () => unsubscribe()
  }, [user])

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { isRead: true })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleNotificationClick = (notification) => {
    markNotificationAsRead(notification.id)
    setShowNotificationDropdown(false)
    if (notification.orderId) navigate('/orders')
  }

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return 'Just now'
    const date = timestamp.toDate?.() || new Date(timestamp)
    const diffMins = Math.floor((Date.now() - date) / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const term = headerSearch.trim()
    if (location.pathname === '/shop') {
      navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop', { replace: true })
    } else {
      navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop')
    }
  }

  const homeLink = userRole === 'admin' ? '/dashboard' : userRole === 'seller' ? '/seller/dashboard' : '/shop'
  const displayName = userName || user?.email?.split('@')[0] || 'Account'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <header className="header">
      {/* Top utility bar */}
      <div className="header-top-bar">
        <div className="header-top-inner">
          <div className="header-top-links">
            {userRole === 'seller' && (
              <Link to="/seller/dashboard" className="header-top-link">Seller Center</Link>
            )}
            {userRole === 'admin' && (
              <Link to="/dashboard" className="header-top-link">Admin Panel</Link>
            )}
            <Link to="/shop" className="header-top-link">Shop</Link>
          </div>
          <div className="header-top-links">
            {user && userRole === 'user' && (
              <button
                type="button"
                className="header-top-link header-top-btn"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <Bell size={14} />
                Notifications
                {unreadNotifications > 0 && <span className="header-top-badge">{unreadNotifications}</span>}
              </button>
            )}
            {!user && (
              <button type="button" className="header-top-link header-top-btn" onClick={() => setShowLoginModal(true)}>
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="header-main">
        <div className="header-main-inner">
          <Link to={homeLink} className="header-logo">
            <img src={bambooHomeLogo} alt="Bamboo Home" className="header-logo-img" />
          </Link>

          <form className="header-search-form" onSubmit={handleSearchSubmit}>
            <Search size={18} className="header-search-icon" />
            <input
              type="search"
              className="header-search-input"
              placeholder="Search bamboo furniture, stores..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
            />
          </form>

          <div className="header-actions">
            {user ? (
              <>
                <Link to="/chat" className="header-action-btn" title="Messages">
                  <MessageCircle size={20} />
                  {unreadMessages > 0 && <span className="header-action-badge">{unreadMessages}</span>}
                </Link>
                {userRole === 'user' && (
                  <Link to="/cart" className="header-action-btn" title="Cart">
                    <ShoppingCart size={20} />
                    {getCartItemCount() > 0 && <span className="header-action-badge">{getCartItemCount()}</span>}
                  </Link>
                )}
                {userRole === 'admin' && (
                  <button
                    type="button"
                    className="header-action-btn header-add-btn"
                    onClick={() => { setModalCategory(''); setShowProductModal(true) }}
                  >
                    + Add
                  </button>
                )}
                <Link to={userRole === 'user' ? '/profile' : homeLink} className="header-user-chip">
                  <span className="header-user-avatar">{initials}</span>
                  <span className="header-user-name">{displayName}</span>
                </Link>
              </>
            ) : (
              <button type="button" className="header-login-btn" onClick={() => setShowLoginModal(true)}>
                Login / Sign Up
              </button>
            )}

            <button type="button" className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menu">
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <nav className={`header-mobile-nav ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/shop" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Shop</Link>
        {user && userRole === 'user' && (
          <>
            <Link to="/cart" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Cart</Link>
            <Link to="/orders" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Orders</Link>
            <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Profile</Link>
          </>
        )}
        {user && userRole === 'seller' && (
          <Link to="/seller/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Seller Dashboard</Link>
        )}
        {user && userRole === 'admin' && (
          <Link to="/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Admin Dashboard</Link>
        )}
        <Link to="/chat" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Messages</Link>
        {user && (
          <button
            type="button"
            className="mobile-nav-link mobile-nav-logout"
            onClick={async () => { await logout(); navigate('/'); setIsMenuOpen(false) }}
          >
            Logout
          </button>
        )}
      </nav>

      {!user && (
        <>
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSwitchToSignup={() => { setShowLoginModal(false); setShowSignupModal(true) }} />
          <SignupModal isOpen={showSignupModal} onClose={() => setShowSignupModal(false)} onSwitchToLogin={() => { setShowSignupModal(false); setShowLoginModal(true) }} />
        </>
      )}
      {user && userRole === 'admin' && (
        <ProductModal
          isOpen={showProductModal}
          category={modalCategory}
          editingProduct={null}
          onClose={() => { setShowProductModal(false); setModalCategory('') }}
          onProductAdded={() => { setShowProductModal(false); setModalCategory('') }}
        />
      )}

      {showNotificationDropdown && user && userRole === 'user' && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            <button type="button" className="notification-dropdown-close" onClick={() => setShowNotificationDropdown(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="notification-dropdown-body">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.5, display: 'block' }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`notification-item ${notif.isRead ? '' : 'unread'}`}
                >
                  <div className="notification-item-top">
                    <span className="notification-item-title">
                      {notif.type === 'order_accepted' ? '✅ Order Accepted' : '🚚 Out for Delivery'}
                    </span>
                    <span className="notification-item-time">{formatNotificationTime(notif.createdAt)}</span>
                  </div>
                  <p className="notification-item-message">{notif.message}</p>
                  <span className="notification-item-order">Order #{notif.orderId?.slice(0, 8).toUpperCase()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </header>
  )
}
