import React, { useState } from 'react'
import { RotateCcw, Trash2, User, Package, X } from 'lucide-react'

export default function AdminRecycleBin({ users, products, onRestoreUser, onRestoreProduct, onPermanentDeleteUser, onPermanentDeleteProduct, formatDate }) {
  // deleted lists are filtered upstream to exclude self-deletes when desired
  // Exclude items that were permanently deleted from the recycle bin UI
  const deletedUsers = users.filter((user) => user.deleted && user.deleted !== undefined && !user.permanentlyDeleted)
  const deletedProducts = products.filter((product) => product.deleted && !product.permanentlyDeleted)

  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [activeTab, setActiveTab] = useState('users')

  const panelStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '20px' }
  const clickableInfoStyle = { cursor: 'pointer' }
  const restoreStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', borderRadius: '7px', padding: '9px 12px', background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
  const permaStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(211,47,47,0.35)', borderRadius: '7px', padding: '9px 12px', background: '#fff', color: 'var(--danger-color)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
  const closeBtnStyle = { position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', cursor: 'pointer' }

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Recycle Bin</h2>
        <p style={{ margin: '6px 0 12px', color: '#6b7280' }}>Restore deleted seller accounts, buyer accounts, and products.</p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setActiveTab('users')}
            className={`recycle-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            aria-pressed={activeTab === 'users'}
            title={`Deleted Users (${deletedUsers.length})`}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <User size={16} />
              <span style={{ fontWeight: 700 }}>Deleted Users</span>
            </div>
            <span className={`recycle-badge ${deletedUsers.length === 0 ? 'zero' : ''}`}>{deletedUsers.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`recycle-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            aria-pressed={activeTab === 'products'}
            title={`Deleted Products (${deletedProducts.length})`}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Package size={16} />
              <span style={{ fontWeight: 700 }}>Deleted Products</span>
            </div>
            <span className={`recycle-badge ${deletedProducts.length === 0 ? 'zero' : ''}`}>{deletedProducts.length}</span>
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <section style={panelStyle}>
          <h3 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={19} /> Deleted Users ({deletedUsers.length})</h3>
          {deletedUsers.length === 0 ? <p style={{ color: '#6b7280', margin: 0 }}>No deleted users.</p> : deletedUsers.map((user) => (
            <div key={user.id} className="recycle-row">
              <div style={clickableInfoStyle} onClick={() => setSelectedUser(user)}>
                <strong style={{ display: 'block' }}>{user.name || user.email}</strong>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>{user.email} · {user.role} · Deleted {formatDate(user.deletedAt)}</div>
              </div>
              <div className="recycle-action-buttons">
                <button className="recycle-btn" style={restoreStyle} onClick={() => onRestoreUser(user.id)}><RotateCcw size={15} /> Restore</button>
                <button className="recycle-btn" style={permaStyle} onClick={() => onPermanentDeleteUser && onPermanentDeleteUser(user.id)}><Trash2 size={15} /> Delete Permanently</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'products' && (
        <section style={panelStyle}>
          <h3 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={19} /> Deleted Products ({deletedProducts.length})</h3>
          {deletedProducts.length === 0 ? <p style={{ color: '#6b7280', margin: 0 }}>No deleted products.</p> : deletedProducts.map((product) => (
            <div key={product.id} className="recycle-row">
              <div style={clickableInfoStyle} onClick={() => setSelectedProduct(product)}>
                <strong style={{ display: 'block' }}>{product.name}</strong>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>{product.storeName || 'Unknown store'} · Deleted {formatDate(product.deletedAt)}</div>
              </div>
              <div className="recycle-action-buttons">
                <button className="recycle-btn" style={restoreStyle} onClick={() => onRestoreProduct(product.id)}><RotateCcw size={15} /> Restore</button>
                <button className="recycle-btn" style={permaStyle} onClick={() => onPermanentDeleteProduct && onPermanentDeleteProduct(product.id)}><Trash2 size={15} /> Delete Permanently</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* User details modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 16 }} onClick={() => setSelectedUser(null)}>
          <div className="recycle-modal-inner" style={{ background: '#fff', borderRadius: 12, padding: 24, position: 'relative', width: '100%', maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setSelectedUser(null)}><X size={18} /></button>
            <h2 style={{ marginTop: 0 }}>{selectedUser.name || selectedUser.email}</h2>
            <p style={{ color: '#6b7280', marginTop: 6 }}>{selectedUser.email} · {selectedUser.role}</p>
            <div className="recycle-modal-grid" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><strong>Member Since</strong><div style={{ color: '#6b7280' }}>{formatDate(selectedUser.createdAt)}</div></div>
              <div><strong>Deleted At</strong><div style={{ color: '#6b7280' }}>{formatDate(selectedUser.deletedAt)}</div></div>
              {selectedUser.isSuspended && (
                <div style={{ gridColumn: '1 / -1', color: '#EF4444' }}><strong>Suspended</strong><div>{selectedUser.suspensionReason || 'No reason provided'}</div></div>
              )}
            </div>

            <div className="recycle-action-buttons" style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="recycle-btn" onClick={() => setSelectedUser(null)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Close</button>
              <button className="recycle-btn" onClick={() => { onRestoreUser(selectedUser.id); setSelectedUser(null) }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff' }}><RotateCcw size={14} /> Restore User</button>
              <button className="recycle-btn" onClick={() => { onPermanentDeleteUser && onPermanentDeleteUser(selectedUser.id); setSelectedUser(null) }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(211,47,47,0.35)', background: '#fff', color: 'var(--danger-color)' }}><Trash2 size={14} /> Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Product details modal */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 16 }} onClick={() => setSelectedProduct(null)}>
          <div className="recycle-modal-inner" style={{ background: '#fff', borderRadius: 12, padding: 24, position: 'relative', width: '100%', maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setSelectedProduct(null)}><X size={18} /></button>
            <h2 style={{ marginTop: 0 }}>{selectedProduct.name}</h2>
            <p style={{ color: '#6b7280', marginTop: 6 }}>{selectedProduct.storeName || 'Unknown store'} · ID: {selectedProduct.id}</p>
            <div className="recycle-modal-grid" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><strong>Category</strong><div style={{ color: '#6b7280' }}>{selectedProduct.category || 'Uncategorized'}</div></div>
              <div><strong>Price</strong><div style={{ color: '#6b7280' }}>{selectedProduct.price ? `₱${selectedProduct.price}` : 'N/A'}</div></div>
              <div><strong>Stock</strong><div style={{ color: '#6b7280' }}>{selectedProduct.stock ?? 'N/A'}</div></div>
              <div><strong>Deleted At</strong><div style={{ color: '#6b7280' }}>{formatDate(selectedProduct.deletedAt)}</div></div>
            </div>

            <div className="recycle-action-buttons" style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="recycle-btn" onClick={() => setSelectedProduct(null)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Close</button>
              <button className="recycle-btn" onClick={() => { onRestoreProduct(selectedProduct.id); setSelectedProduct(null) }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff' }}><RotateCcw size={14} /> Restore Product</button>
              <button className="recycle-btn" onClick={() => { onPermanentDeleteProduct && onPermanentDeleteProduct(selectedProduct.id); setSelectedProduct(null) }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(211,47,47,0.35)', background: '#fff', color: 'var(--danger-color)' }}><Trash2 size={14} /> Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
