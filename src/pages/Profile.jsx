import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useAuth, CEBU_CITIES_AND_MUNICIPALITIES, PINAMUNGAJAN_BARANGAYS } from '../context/AuthContext'
import UserSidebar from '../components/UserSidebar'
import { useConfirmation } from '../context/ConfirmationContext'
import { Toast } from '../components/Toast'
import '../css/Profile.css'
import '../css/AdminDashboardLayout.css'

export function Profile() {
  const { user, userRole, logout } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [municipalityState, setMunicipalityState] = useState('')
  const [barangayState, setBarangayState] = useState('')
  const [editingContact, setEditingContact] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [activeView, setActiveView] = useState('profile')
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const { openConfirmation } = useConfirmation()

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
        setDisplayName(userData.fullName || userData.name || userData.displayName || user.email || 'User')
        setContactNumber(userData.contactNumber || '')
        setMunicipalityState(userData.municipality || '')
        setBarangayState(userData.barangay || '')
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
      <div className="dashboard-shell-inner">
        <UserSidebar activeView={activeView} setActiveView={setActiveView} />
        
        <main className="admin-main-content">
          <div className="admin-page-header">
          <div className="header-content">
            <h1>My Dashboard</h1>
            <p className="header-subtitle">Welcome back, {displayName}!</p>
          </div>
          {toastMessage && (
            <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
          )}
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
                        <span className="value">
                          {contactNumber ? (
                            <>{contactNumber}</>
                          ) : (
                            'Not provided'
                          )}
                        </span>
                        <div style={{ marginLeft: '12px' }}>
                          {editingContact ? (
                            <>
                              <input
                                type="tel"
                                value={contactNumber}
                                onChange={(e) => setContactNumber(e.target.value.replace(/(?!^\+)\D/g, '').slice(0, 13))}
                                placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                                style={{ padding: '6px 8px', marginRight: 8 }}
                              />
                              <button
                                className="btn btn-primary"
                                disabled={savingContact}
                                onClick={async () => {
                                  // Save contactNumber, municipality, barangay
                                  setSavingContact(true)
                                  try {
                                    if (!user) return
                                    await updateDoc(doc(db, 'users', user.uid), {
                                      contactNumber: contactNumber || null,
                                      municipality: municipalityState || null,
                                      barangay: barangayState || null,
                                      updatedAt: new Date(),
                                    })
                                    setToastMessage('Profile updated successfully')
                                    setToastType('success')
                                    setEditingContact(false)
                                  } catch (err) {
                                    console.error('Error updating profile:', err)
                                    setToastMessage('Failed to update profile')
                                    setToastType('error')
                                  } finally {
                                    setSavingContact(false)
                                  }
                                }}
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-outline"
                                onClick={() => {
                                  setEditingContact(false)
                                }}
                                style={{ marginLeft: 8 }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button className="btn btn-outline" onClick={() => setEditingContact(true)} style={{ marginLeft: 8 }}>
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                          <div className="detail-row">
                            <span className="label">Address</span>
                            <span className="value">
                              {barangayState && municipalityState ? `Barangay ${barangayState}, ${municipalityState}` : 'Not provided'}
                            </span>
                            <div style={{ marginLeft: '12px' }}>
                              {editingContact ? (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <select
                                    value={municipalityState}
                                    onChange={(e) => {
                                      const selected = e.target.value
                                      setMunicipalityState(selected)
                                      // if not Pinamungajan, clear barangay
                                      if (selected !== 'Pinamungajan') {
                                        setBarangayState('')
                                      }
                                    }}
                                    className="role-select-input"
                                    style={{ padding: '6px 8px' }}
                                  >
                                    <option value="">Select municipality</option>
                                    {CEBU_CITIES_AND_MUNICIPALITIES.map((loc) => (
                                      <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                  </select>

                                  <select
                                    value={barangayState}
                                    onChange={(e) => setBarangayState(e.target.value)}
                                    className="role-select-input"
                                    style={{ padding: '6px 8px' }}
                                    disabled={municipalityState !== 'Pinamungajan'}
                                  >
                                    <option value="">Select barangay</option>
                                    {PINAMUNGAJAN_BARANGAYS.map((b) => (
                                      <option key={b} value={b}>{b}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
                            </div>
                          </div>
                    </div>

                  <div className="details-card">
                    <h3>Account Security</h3>
                    <div className="detail-row">
                      <span className="label">Account Status</span>
                      <span className="value">Active</span>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <button
                        className="btn btn-danger"
                        onClick={() => {
                          openConfirmation({
                            title: 'Delete Account',
                            message: 'Are you sure you want to permanently delete your account? This will prevent future logins.',
                            warningText: 'This action can be reversed by an admin from the Recycle Bin.',
                            onConfirm: async () => {
                              try {
                                if (!user) return
                                await updateDoc(doc(db, 'users', user.uid), { deleted: true, deletedAt: new Date(), deletedBy: 'user' })
                                await logout()
                                setToastMessage('Your account has been deleted. You will be signed out.')
                                setToastType('success')
                                navigate('/')
                              } catch (err) {
                                console.error('Error deleting account:', err)
                                setToastMessage('Failed to delete account: ' + (err.message || err))
                                setToastType('error')
                              }
                            }
                          })
                        }}
                      >
                        Delete Account
                      </button>
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
    </div>
  )
}
