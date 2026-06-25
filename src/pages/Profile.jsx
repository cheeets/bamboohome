import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import UserSidebar from '../components/UserSidebar'
import '../css/Profile.css'
import '../css/AdminDashboardLayout.css'

export function Profile() {
  const { user, userRole, logout } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [activeView, setActiveView] = useState('profile')

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    fetchUserData()
  }, [user, navigate])

  const fetchUserData = async () => {
    if (!user) return
    try {
      const userDocRef = doc(db, 'users', user.uid)
      const userDocSnap = await getDoc(userDocRef)
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        setDisplayName(userData.name || userData.displayName || user.email || 'User')
      } else {
        setDisplayName(user.email || 'User')
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      setDisplayName(user.email || 'User')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (userRole === 'admin' || userRole === 'seller') {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-card">
            <div className="profile-header-top">
              <div className="profile-details">
                <h1 className="profile-display-name">{displayName}</h1>
                <p className="profile-email">{user?.email}</p>
              </div>
              <button onClick={handleLogout} className="btn-logout-header">
                Logout
              </button>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Dashboard</h2>
            </div>
            <div className="card-content">
              <button 
                onClick={() => navigate(userRole === 'admin' ? '/dashboard' : '/seller/dashboard')} 
                className="btn btn-primary btn-lg"
              >
                Go to {userRole === 'admin' ? 'Admin' : 'Seller'} Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard-layout">
      <UserSidebar activeView={activeView} setActiveView={setActiveView} />
      
      <main className="admin-main-content">
        <div className="admin-page-header">
          <div className="header-content">
            <h1>My Dashboard</h1>
            <p className="header-subtitle">Welcome back, {displayName}!</p>
          </div>
          <div className="header-stats">
            <div className="quick-stat">
              <span className="stat-label">Member Since</span>
              <span className="stat-value" style={{ fontSize: '1rem' }}>
                {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-content-area">
          {activeView === 'profile' && (
            <div className="profile-standard-view">
              <div className="profile-header-card">
                <div className="profile-avatar-wrapper">
                  <div className="profile-avatar-large">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <button className="edit-avatar-btn">📷</button>
                </div>
                <div className="profile-main-info">
                  <h2 className="profile-name">{displayName}</h2>
                  <p className="profile-role-text">Verified Customer</p>
                  <div className="profile-meta">
                    <span>📍 Philippines</span>
                    <span>•</span>
                    <span>Joined {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="details-column">
                  <div className="details-card">
                    <h3>Contact Information</h3>
                    <div className="detail-row">
                      <span className="label">Email</span>
                      <span className="value">{user?.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone</span>
                      <span className="value">Not provided</span>
                    </div>
                  </div>

                  <div className="details-card">
                    <h3>Account Security</h3>
                    <div className="detail-row">
                      <span className="label">Account Status</span>
                      <span className="value">Active</span>
                    </div>
                  </div>
                </div>

                <div className="details-column">
                  <div className="details-card">
                    <h3>Shopping Activity</h3>
                    <div className="activity-stats">
                      <div className="stat-item" onClick={() => navigate('/orders')}>
                        <span className="stat-icon">📦</span>
                        <span className="stat-label">Orders</span>
                      </div>
                      <div className="stat-item" onClick={() => navigate('/chat')}>
                        <span className="stat-icon">💬</span>
                        <span className="stat-label">Chats</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">⭐</span>
                        <span className="stat-label">Reviews</span>
                      </div>
                    </div>
                  </div>

                  <div className="details-card">
                    <h3>Preferences</h3>
                    <div className="detail-row">
                      <span className="label">Language</span>
                      <span className="value">English</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Currency</span>
                      <span className="value">PHP (₱)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
