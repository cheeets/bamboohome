import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../css/AdminSidebar.css'

export default function AdminSidebar({ activeView, setActiveView, activeSubView, setActiveSubView }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)
  const { logout } = useAuth()
  const navigate = useNavigate()

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

  const menuItems = [
    {
      label: 'Analytics',
      id: 'analytics',
      icon: '📊',
      subItems: [
        { label: 'Orders Analytics', id: 'orders-analytics' },
        { label: 'Sales Analytics', id: 'sales-analytics' },
        { label: 'Product Performance', id: 'product-performance' },
        { label: 'Platform Stats', id: 'platform-stats' },
      ],
    },
    {
      label: 'User Management',
      id: 'users',
      icon: '👥',
      subItems: [
        { label: 'All Users', id: 'all-users' },
        { label: 'Customers', id: 'customers' },
        { label: 'Sellers', id: 'sellers' },
        { label: 'Admins', id: 'admins' },
      ],
    },
    {
      label: 'Global Inventory',
      id: 'inventory',
      icon: '📦',
      subItems: [
        { label: 'Inventory Overview', id: 'inventory-overview' },
        { label: 'Low Stock Alerts', id: 'low-stock-alerts' },
      ],
    },
  ]

  const handleMenuClick = (menuId, firstSubId = null) => {
    setActiveView(menuId)
    if (firstSubId) {
      setActiveSubView(firstSubId)
    }
  }

  const handleSubMenuClick = (e, subId) => {
    e.stopPropagation()
    setActiveSubView(subId)
  }

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
          <div className="sidebar-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🍃</span>
            <div className="logo-text">
              <h2>GreenNest</h2>
              <p>Admin Panel</p>
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
                onClick={() => handleMenuClick(item.id, item.subItems[0]?.id)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </button>

              {activeView === item.id && (
                <div className="submenu">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      className={`submenu-item ${activeSubView === subItem.id ? 'active' : ''}`}
                      onClick={(e) => handleSubMenuClick(e, subItem.id)}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <p className="user-role">Administrator</p>
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
