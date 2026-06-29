import React, { useState } from 'react'
import { useConfirmation } from '../context/ConfirmationContext'
import {
  Users,
  User,
  ShieldCheck,
  Store,
  ShoppingBag,
  Search,
  Calendar,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Edit,
  Ban,
  RotateCcw
} from 'lucide-react'
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
  handleSuspendUser,
  handleUnsuspendUser,
  formatDate,
  onViewStore,
}) {
  const { openConfirmation } = useConfirmation()
  const [suspensionReason, setSuspensionReason] = useState('')
  const [suspensionDuration, setSuspensionDuration] = useState(1)
  const [suspensionUnit, setSuspensionUnit] = useState('days')
  const [showSuspensionModal, setShowSuspensionModal] = useState(null)
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

  const filteredUsers = allUsers.filter(u => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      u.email?.toLowerCase().includes(searchLower) || 
      u.name?.toLowerCase().includes(searchLower) ||
      u.displayName?.toLowerCase().includes(searchLower)
    
    const matchesRole = filterRole === 'all' || u.role === filterRole
    
    return matchesSearch && matchesRole
  })

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <ShieldCheck size={20} />
      case 'seller': return <Store size={20} />
      case 'user': return <User size={20} />
      default: return <User size={20} />
    }
  }

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'role-admin'
      case 'seller': return 'role-seller'
      case 'user': return 'role-user'
      default: return 'role-user'
    }
  }

  return (
    <>
      <div className="users-management-section">
        <div className="users-header">
          <div className="header-title-group">
            <h2 className="apd-title-with-icon"><Users size={28} /> User Access Control</h2>
            <p className="header-subtitle">Manage platform permissions and user roles</p>
          </div>
          <div className="user-count-display">{filteredUsers.length} Users Found</div>
        </div>

        <div className="user-stats-grid">
          <div className="stat-card">
            <div className="stat-icon total"><Users size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Total Users</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon customer"><ShoppingBag size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Customers</span>
              <span className="stat-value">{stats.customers}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon seller"><Store size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Sellers</span>
              <span className="stat-value">{stats.sellers}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon admin"><ShieldCheck size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Admins</span>
              <span className="stat-value">{stats.admins}</span>
            </div>
          </div>
        </div>

        <div className="table-controls">
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="role-filters">
            <button className={`filter-chip ${filterRole === 'all' ? 'active' : ''}`} onClick={() => setFilterRole('all')}>All</button>
            <button className={`filter-chip ${filterRole === 'user' ? 'active' : ''}`} onClick={() => setFilterRole('user')}>Customers</button>
            <button className={`filter-chip ${filterRole === 'seller' ? 'active' : ''}`} onClick={() => setFilterRole('seller')}>Sellers</button>
            <button className={`filter-chip ${filterRole === 'admin' ? 'active' : ''}`} onClick={() => setFilterRole('admin')}>Admins</button>
          </div>
        </div>

        {loading && <div className="loading-container"><div className="spinner"></div><p>Loading user directory...</p></div>}
        {error && <div className="error-container"><AlertCircle size={24} /><p>{error}</p></div>}

        {!loading && !error && (
          <div className="rbac-table-wrapper">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Current Role</th>
                  <th>Joined Date</th>
                  <th>Access Management</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-row">No users found matching your criteria</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className={`avatar ${getRoleColor(user.role)}`}>
                            {user.name?.[0] || user.email?.[0] || 'U'}
                          </div>
                          <div className="user-meta">
                            <span className="name">{user.name || user.displayName || 'No Name'}</span>
                            <span className="email">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-tag ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
        <div className="action-cell">
          {user.role === 'seller' && (
            <button className="icon-btn" onClick={() => onViewStore(user)} title="View Store">
              <Store size={16} />
            </button>
          )}
          {user.role === 'seller' && !user.isSuspended && (
            <button className="icon-btn" style={{ color: '#EF4444' }} onClick={() => {
              console.log('🎯 Suspend button clicked for user:', user.email, user.id)
              setShowSuspensionModal(user)
              setSuspensionReason('')
            }} title="Suspend Seller">
              <Ban size={16} />
            </button>
          )}
          {user.role === 'seller' && user.isSuspended && (
            <button className="icon-btn" style={{ color: '#10B981' }} onClick={() => {
              console.log('🔄 Unsuspend button clicked for user:', user.email, user.id)
              openConfirmation({
                title: 'Unsuspend Seller',
                message: `Unsuspend ${user.email}?`,
                onConfirm: () => handleUnsuspendUser(user.id)
              })
            }} title="Unsuspend Seller">
              <RotateCcw size={16} />
            </button>
          )}
          <button className="icon-btn edit" onClick={() => handleViewUser(user)} title="Change Permissions">
            <Edit size={16} />
          </button>
          <button className="icon-btn delete" onClick={(e) => {
            console.log('Delete button clicked for user:', user)
            console.log('Calling handleDeleteUser with:', user.id)
            openConfirmation({
              title: 'Revoke Access',
              message: `Revoke all access for ${user.email}?`,
              onConfirm: () => handleDeleteUser(user.id)
            })
          }} title="Delete User">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUserDetails && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="user-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className={`modal-avatar ${getRoleColor(selectedUser.role)}`}>
                  {getRoleIcon(selectedUser.role)}
                </div>
                <div>
                  <h2>Edit Member Role</h2>
                  <p className="user-email">{selectedUser.email}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={handleCloseDetails}><X size={20} /></button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h3><Calendar size={18} /> Account Information</h3>
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
                  {selectedUser.isSuspended && (
                    <>
                      <div className="detail-row" style={{ color: '#EF4444' }}>
                        <span className="detail-label">Status</span>
                        <span className="detail-value">⚠️ Suspended: {selectedUser.suspensionReason || 'No reason provided'}</span>
                      </div>
                      {selectedUser.suspensionEndAt && (
                        <div className="detail-row">
                          <span className="detail-label">Suspension Ends</span>
                          <span className="detail-value">{formatDate(selectedUser.suspensionEndAt)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="modal-section">
                <h3><ShieldCheck size={18} /> Role Management</h3>
                <div className="role-selector-group">
                  <select
                    value={editingRole[selectedUser.id] || selectedUser.role}
                    onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                    className="role-select-input"
                  >
                    <option value="user">Customer</option>
                    <option value="seller">Seller</option>
                    <option value="admin">Admin</option>
                  </select>
                  {editingRole[selectedUser.id] && editingRole[selectedUser.id] !== selectedUser.role && (
                    <button className="save-role-btn" onClick={() => handleSaveRole(selectedUser.id)}>
                      <CheckCircle2 size={14} /> Save Role
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseDetails}>Close</button>
              {selectedUser.role === 'seller' && selectedUser.isSuspended && (
                <button className="btn-primary" onClick={() => {
                  openConfirmation({
                    title: 'Unsuspend Seller',
                    message: `Unsuspend ${selectedUser.email}?`,
                    onConfirm: () => {
                      handleUnsuspendUser(selectedUser.id)
                      handleCloseDetails()
                    }
                  })
                }}>
                  <RotateCcw size={14} /> Unsuspend Seller
                </button>
              )}
              <button className="btn-danger" onClick={() => {
                console.log('Delete button in user details clicked for:', selectedUser)
                openConfirmation({
                  title: 'Delete User',
                  message: `Are you sure you want to delete ${selectedUser.email}?`,
                  onConfirm: () => {
                    console.log('onConfirm called in user details modal')
                    handleDeleteUser(selectedUser.id)
                    handleCloseDetails()
                  }
                })
              }}>
                <Trash2 size={14} /> Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuspensionModal && (
        <div className="modal-overlay" onClick={() => setShowSuspensionModal(null)}>
          <div className="user-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-avatar" style={{ background: '#FEE2E2', color: '#EF4444' }}>
                  <Ban size={24} />
                </div>
                <div>
                  <h2>Suspend Seller</h2>
                  <p className="user-email">{showSuspensionModal.email}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowSuspensionModal(null)}><X size={20} /></button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h3><AlertCircle size={18} /> Suspension Reason</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  Please provide a reason for suspending this seller. The seller will be notified.
                </p>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g., Violation of platform guidelines, multiple reports, etc."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    minHeight: '100px',
                    resize: 'vertical',
                    marginBottom: '24px'
                  }}
                />
              </div>
              
              <div className="modal-section">
                <h3><AlertCircle size={18} /> Suspension Duration</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  Set how long the seller will be suspended. After this time, the account will be automatically unsuspended.
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={suspensionDuration}
                    onChange={(e) => setSuspensionDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: '120px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <select
                    value={suspensionUnit}
                    onChange={(e) => setSuspensionUnit(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSuspensionModal(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => {
                console.log('✅ Confirm Suspension clicked:', { 
                  userId: showSuspensionModal.id, 
                  reason: suspensionReason,
                  duration: suspensionDuration,
                  unit: suspensionUnit
                })
                handleSuspendUser(showSuspensionModal.id, suspensionReason, suspensionDuration, suspensionUnit)
                setShowSuspensionModal(null)
              }}>
                <Ban size={14} /> Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
