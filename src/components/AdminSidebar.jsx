import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  BarChart3, 
  LogOut, 
  Menu, 
  Package, 
  ShoppingBag, 
  Store, 
  User, 
  Users, 
  X,
  Tag,
  Award,
  Flag
} from 'lucide-react'
import '../css/AdminSidebar.css'

export default function AdminSidebar({ activeView, setActiveView, activeSubView, setActiveSubView }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024)
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMenuClick = (menuId, firstSubId = null) => {
    setActiveView(menuId)
    if (firstSubId) {
      setActiveSubView(firstSubId)
    }
    window.scrollTo(0, 0)
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false)
    }
  }

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
          <div className="logo-container" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <h2>GreenNest</h2>
            <span className="admin-badge">Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="nav-label">Platform Core</span>
            <button
              className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
              onClick={() => handleMenuClick('analytics', 'orders-analytics')}
            >
              <BarChart3 size={16} /> Analytics
            </button>
            <button
              className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
              onClick={() => handleMenuClick('users', 'all-users')}
            >
              <Users size={16} /> Users
            </button>
            <button
              className={`nav-item ${activeView === 'seller-performance' ? 'active' : ''}`}
              onClick={() => handleMenuClick('seller-performance', 'seller-metrics')}
            >
              <Award size={16} /> Seller Performance
            </button>
          </div>

          <div className="nav-group">
            <span className="nav-label">Catalog Management</span>
            <button
              className={`nav-item ${activeView === 'categories' ? 'active' : ''}`}
              onClick={() => handleMenuClick('categories', 'all-categories')}
            >
              <Tag size={16} /> Categories
            </button>
            <button
              className={`nav-item ${activeView === 'products' ? 'active' : ''}`}
              onClick={() => handleMenuClick('products', 'all-products')}
            >
              <ShoppingBag size={16} /> Products
            </button>
            <button
              className={`nav-item ${activeView === 'inventory' ? 'active' : ''}`}
              onClick={() => handleMenuClick('inventory', 'inventory-overview')}
            >
              <Package size={16} /> Inventory
            </button>
          </div>

          <div className="nav-group">
            <span className="nav-label">Moderation</span>
            <button
              className={`nav-item ${activeView === 'reports' ? 'active' : ''}`}
              onClick={() => handleMenuClick('reports')}
            >
              <Flag size={16} /> Store Reports
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
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
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
    </div>
  )
}
