import React, { useState } from 'react'
import '../css/AdminUsersDashboard.css'

export default function AdminUsersDashboard({
  loading,
  error,
  allUsers,
  stats,
  filterRole,
  setFilterRole,
  handleDeleteUser,
  handleChangeRole,
  formatDate,
  onViewStore,
}) {
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editingRole, setEditingRole] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const handleCloseDetails = () => {
    setShowUserDetails(false)
    setSelectedUser(null)
  }

  const handleRoleChange = (userId, newRole) => {
    setEditingRole(prev => ({ ...prev, [userId]: newRole }))
  }

  const handleSaveRole = (userId) => {
    const newRole = editingRole[userId]
    if (newRole) {
      handleChangeRole(userId, newRole)
      setEditingRole(prev => {
        const updated = { ...prev }
        delete updated[userId]
        return updated
      })
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole })
      }
    }
  }

  const filteredUsers = filterRole === 'all' 
    ? allUsers.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allUsers.filter((u) => 
        u.role === filterRole && (
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return '👑'
      case 'seller': return '🏪'
      case 'user': return '👤'
      default: return '👤'
    }
  }

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'admin'
      case 'seller': return 'seller'
      case 'user': return 'customer'
      default: return 'customer'
    }
  }

  return (
    <>
      <div className="users-management-section">
        {/* Header */}
        <div className="users-header">
          <div className="header-title-group">
            <h2>👥 User Management</h2>
            <p className="header-subtitle">Manage platform users and their roles</p>
          </div>
          <div className="user-count-display">{filteredUsers.length} Users</div>
        </div>

        {/* Stats Cards */}
        <div className="user-stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
          <div className="stat-card stat-customers">
            <div className="stat-icon">🛍️</div>
            <div className="stat-content">
              <h3>Customers</h3>
              <p className="stat-value">{stats.customers}</p>
            </div>
          </div>
          <div className="stat-card stat-sellers">
            <div className="stat-icon">🏪</div>
            <div className="stat-content">
              <h3>Sellers</h3>
              <p className="stat-value">{stats.sellers}</p>
            </div>
          </div>
          <div className="stat-card stat-admins">
            <div className="stat-icon">👑</div>
            <div className="stat-content">
              <h3>Admins</h3>
              <p className="stat-value">{stats.admins}</p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="🔍 Search by email or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterRole === 'all' ? 'active' : ''}`}
              onClick={() => setFilterRole('all')}
            >
              <span className="btn-icon">📋</span>
              All ({stats.total})
            </button>
            <button
              className={`filter-btn ${filterRole === 'user' ? 'active' : ''}`}
              onClick={() => setFilterRole('user')}
            >
              <span className="btn-icon">🛍️</span>
              Customers ({stats.customers})
            </button>
            <button
              className={`filter-btn ${filterRole === 'seller' ? 'active' : ''}`}
              onClick={() => setFilterRole('seller')}
            >
              <span className="btn-icon">🏪</span>
              Sellers ({stats.sellers})
            </button>
            <button
              className={`filter-btn ${filterRole === 'admin' ? 'active' : ''}`}
              onClick={() => setFilterRole('admin')}
            >
              <span className="btn-icon">👑</span>
              Admins ({stats.admins})
            </button>
          </div>
        </div>

        {loading && <div className="loading-spinner">Loading users...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && allUsers.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No users found</p>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>
              No{' '}
              {filterRole === 'all'
                ? 'users'
                : filterRole === 'admin'
                  ? 'admins'
                  : filterRole === 'seller'
                    ? 'sellers'
                    : 'customers'}{' '}
              found
            </p>
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <div className="users-list-container">
            {filteredUsers.map((user) => (
              <div key={user.id} className={`user-card role-${getRoleColor(user.role)}`}>
                <div className="user-card-header">
                  <div className="user-avatar-group">
                    <div className={`user-avatar avatar-${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="user-badges">
                      <div className="user-info">
                        <span className="user-name">{user.name || user.displayName || 'No Name'}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                      <span className={`user-role-badge role-${user.role}`}>
                        {user.role === 'admin' ? 'Administrator' : user.role === 'seller' ? 'Seller' : 'Customer'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="user-card-quick-info">
                  <div className="quick-info-item">
                    <span className="info-label">Joined:</span>
                    <span className="info-value">{formatDate(user.createdAt)}</span>
                  </div>
                  {user.role === 'seller' && user.storeName && (
                    <div className="quick-info-item">
                      <span className="info-label">Store:</span>
                      <span className="info-value">{user.storeName}</span>
                    </div>
                  )}
                </div>

                <div className="user-card-actions">
                  {user.role === 'seller' && (
                    <button
                      className="action-btn view-store-btn"
                      onClick={() => onViewStore(user)}
                    >
                      <span>🏪</span> View Store
                    </button>
                  )}
                  <button
                    className="action-btn view-details-btn"
                    onClick={() => handleViewUser(user)}
                  >
                    <span>👁️</span> View Details
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${user.displayName || user.email}?`)) {
                        handleDeleteUser(user.id)
                      }
                    }}
                  >
                    <span>🗑️</span> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="modal-content user-details-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <div className={`modal-avatar avatar-${getRoleColor(selectedUser.role)}`}>
                  {getRoleIcon(selectedUser.role)}
                </div>
                <h2>{selectedUser.name || selectedUser.displayName || 'User Details'}</h2>
              </div>
              <button className="modal-close-btn" onClick={handleCloseDetails}>✕</button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Personal Information */}
              <div className="modal-section">
                <h3 className="section-title">📋 Personal Information</h3>
                <div className="details-grid">
                  <div className="detail-row">
                    <span className="detail-label">Full Name</span>
                    <span className="detail-value">{selectedUser.name || selectedUser.displayName || 'Not provided'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email Address</span>
                    <span className="detail-value">{selectedUser.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Account Status</span>
                    <span className={`detail-badge role-${selectedUser.role}`}>
                      {selectedUser.role === 'admin' ? '👑 Administrator' : selectedUser.role === 'seller' ? '🏪 Seller' : '👤 Customer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="modal-section">
                <h3 className="section-title">⏰ Account Information</h3>
                <div className="details-grid">
                  <div className="detail-row">
                    <span className="detail-label">Member Since</span>
                    <span className="detail-value">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  {selectedUser.role === 'seller' && (
                    <div className="detail-row">
                      <span className="detail-label">Store Name</span>
                      <span className="detail-value">{selectedUser.storeName || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Management */}
              <div className="modal-section">
                <h3 className="section-title">🔐 Role Management</h3>
                <div className="role-selector-group">
                  <select
                    value={editingRole[selectedUser.id] || selectedUser.role}
                    onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                    className="role-select-input"
                  >
                    <option value="user">👤 Customer</option>
                    <option value="seller">🏪 Seller</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                  {editingRole[selectedUser.id] && editingRole[selectedUser.id] !== selectedUser.role && (
                    <button
                      className="action-btn save-role-btn"
                      onClick={() => handleSaveRole(selectedUser.id)}
                    >
                      ✓ Save Role
                    </button>
                  )}
                </div>
                <p className="role-info-text">Changing a user's role will update their permissions immediately.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseDetails}>
                Close
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${selectedUser.displayName || selectedUser.email}?`)) {
                    handleDeleteUser(selectedUser.id)
                    handleCloseDetails()
                  }
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
