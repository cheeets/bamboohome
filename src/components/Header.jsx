import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { LoginModal } from './LoginModal'
import { SignupModal } from './SignupModal'
import { ProductModal } from './ProductModal'
import greennestLogo from '../images/greennestlogo1-Photoroom.png'
import '../css/Header.css'

export function Header() {
  const { user, userRole, logout } = useAuth()
  const { getCartItemCount } = useCart()
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [modalCategory, setModalCategory] = useState('chair')
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close menu on navigation
  useEffect(() => {
    setIsMenuOpen(false)
  }, [navigate])

  // Listen for unread messages
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0)
      return
    }

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter in memory to avoid needing a complex composite index
      const unreadCount = snapshot.docs.filter(doc => {
        const data = doc.data()
        const isUnread = data.isRead !== true
        const isNotMe = (data.sender || data.senderId) !== user.uid
        return isUnread && isNotMe
      }).length
      setUnreadMessages(unreadCount)
    }, (error) => {
      console.error('Header message listener error:', error)
    })

    return () => unsubscribe()
  }, [user])

  // Listen for pending orders
  useEffect(() => {
    if (!user) {
      setPendingOrders(0)
      return
    }

    let q
    if (userRole === 'seller') {
      // For sellers, count pending orders for their products
      q = query(
        collection(db, 'orders'),
        where('sellerId', '==', user.uid),
        where('status', '==', 'Pending')
      )
    } else if (userRole === 'user') {
      // For users, count their own pending orders
      q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        where('status', '==', 'Pending')
      )
    } else {
      return
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrders(snapshot.size)
    })

    return () => unsubscribe()
  }, [user, userRole])

  return (
    <header className="header">
      <div className="header-container">
        <Link
          to={userRole === 'admin' ? '/dashboard' : userRole === 'seller' ? '/seller/dashboard' : '/home'}
          className="header-logo"
        >
          <img 
            src={greennestLogo}
            alt="GreenNest Logo" 
            className="header-logo-img"
          />
        </Link>

        {/* Hamburger Toggle */}
        <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>

        <nav className={`header-nav ${isMenuOpen ? 'open' : ''}`}>
          <Link to="/shop" title="View Shop" className="nav-link icon-link" onClick={() => setIsMenuOpen(false)}>
            <span className="nav-icon">🛍️</span>
            <span className="nav-text">Shop</span>
          </Link>
          {user && userRole === 'admin' && (
            <Link to="/dashboard" title="Admin Dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Admin Dashboard
            </Link>
          )}
          {user && userRole === 'seller' && (
            <Link to="/seller/dashboard" title="Seller Dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Seller Dashboard
            </Link>
          )}
          {user && userRole === 'admin' && (
            <button
              onClick={() => {
                setModalCategory('chair')
                setShowProductModal(true)
                setIsMenuOpen(false)
              }}
              className="nav-link add-product-btn"
              title="Add Product"
            >
              + Add Product
            </button>
          )}
          <Link to="/chat" title="Messages" className="nav-link icon-link" onClick={() => setIsMenuOpen(false)}>
            <div style={{ position: 'relative' }}>
              <span className="nav-icon">💬</span>
              {unreadMessages > 0 && <span className="cart-count-header">{unreadMessages}</span>}
            </div>
            <span className="nav-text">Messages</span>
          </Link>
          {user && userRole === 'user' && (
            <>
              <Link to="/cart" title="View Cart" className="nav-link icon-link" onClick={() => setIsMenuOpen(false)}>
                <span className="nav-icon">🛒</span>
                <span className="nav-text">Cart</span>
                {getCartItemCount() > 0 && <span className="cart-count-header">{getCartItemCount()}</span>}
              </Link>
              <Link to="/orders" title="View Orders" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                Orders {pendingOrders > 0 && <span className="notif-badge">{pendingOrders}</span>}
              </Link>
              <Link to="/profile" title="View Profile" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                Profile
              </Link>
            </>
          )}
          {user && userRole === 'seller' && (
            <>
              <Link to="/seller/dashboard" title="Seller Dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                Orders {pendingOrders > 0 && <span className="notif-badge">{pendingOrders}</span>}
              </Link>
            </>
          )}
          {!user && (
            <button
              onClick={() => {
                setShowLoginModal(true)
                setIsMenuOpen(false)
              }}
              className="nav-link login-btn"
              title="Login"
            >
              Login
            </button>
          )}
        </nav>
        {!user && (
          <>
            <LoginModal
              isOpen={showLoginModal}
              onClose={() => setShowLoginModal(false)}
              onSwitchToSignup={() => {
                setShowLoginModal(false)
                setShowSignupModal(true)
              }}
            />
            <SignupModal
              isOpen={showSignupModal}
              onClose={() => setShowSignupModal(false)}
              onSwitchToLogin={() => {
                setShowSignupModal(false)
                setShowLoginModal(true)
              }}
            />
          </>
        )}
        {user && userRole === 'admin' && (
          <ProductModal
            isOpen={showProductModal}
            category={modalCategory}
            editingProduct={null}
            onClose={() => {
              setShowProductModal(false)
              setModalCategory('chair')
            }}
            onProductAdded={() => {
              setShowProductModal(false)
              setModalCategory('chair')
            }}
          />
        )}
      </div>
    </header>
  )
}
