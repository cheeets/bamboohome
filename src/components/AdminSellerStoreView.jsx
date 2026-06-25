import React, { useState, useEffect } from 'react'
import { db } from '../services/firebase'
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { ProductCard } from './ProductCard'
import { ProductModal } from './ProductModal'
import '../css/SellerDashboard.css' 
import '../css/AdminSellerView.css'

export default function AdminSellerStoreView({ seller, onBack }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)

  useEffect(() => {
    if (!seller?.id) return

    const q = query(
      collection(db, 'products'),
      where('sellerId', '==', seller.id)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = []
      snapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        })
      })
      setProducts(list)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [seller])

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setShowProductModal(true)
  }

  const handleCloseModal = () => {
    setShowProductModal(false)
    setEditingProduct(null)
  }

  const inventoryStats = {
    total: products.length,
    lowStock: products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 5) && (p.stock || 0) > 0).length,
    outOfStock: products.filter(p => (p.stock || 0) <= 0).length
  }

  return (
    <div className="admin-seller-view">
      <div className="admin-view-header">
        <button className="btn-back-admin" onClick={onBack}>
          ← Back to User Management
        </button>
        <div className="admin-mode-badge">
          Admin Viewing Seller Store
        </div>
      </div>

      <div className="seller-store-info-card">
        <div className="store-main-details">
          <h1>🏪 {seller.storeName || seller.name || seller.displayName}'s Store</h1>
          <p className="seller-email-meta">Owner: {seller.email}</p>
        </div>
        
        <div className="inventory-summary-mini">
          <div className="summary-item">
            <span className="summary-val">{inventoryStats.total}</span>
            <span className="summary-lab">Products</span>
          </div>
          <div className={`summary-item ${inventoryStats.lowStock > 0 ? 'warning' : ''}`}>
            <span className="summary-val">{inventoryStats.lowStock}</span>
            <span className="summary-lab">Low Stock</span>
          </div>
          <div className={`summary-item ${inventoryStats.outOfStock > 0 ? 'critical' : ''}`}>
            <span className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 800 }}>{inventoryStats.outOfStock}</span>
            <span className="summary-lab">Out of Stock</span>
          </div>
        </div>
      </div>

      <div className="products-management-section">
        <h2>Product Listings</h2>
        
        {loading ? (
          <div className="loading-spinner">Loading store products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <p>This seller hasn't listed any products yet.</p>
          </div>
        ) : (
          <div className="products-grid-modern">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showManagementActions={true}
                onEditProduct={handleEditProduct}
              />
            ))}
          </div>
        )}
      </div>

      {showProductModal && (
        <ProductModal
          isOpen={showProductModal}
          editingProduct={editingProduct}
          category={editingProduct?.category}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
