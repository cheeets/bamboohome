import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { ProductDetailsModal } from './ProductDetailsModal'
import '../css/ProductCard.css'

export function ProductCard({ product, onProductUpdated, onEditProduct, showManagementActions = false }) {
  const { user, userRole } = useAuth()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const canManage =
    userRole === 'admin' ||
    (showManagementActions && userRole === 'seller' && product?.sellerId && user && product.sellerId === user.uid)

  const handleDeleteProduct = async () => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      setDeleting(true)
      await deleteDoc(doc(db, 'products', product.id))
      if (onProductUpdated) {
        onProductUpdated()
      }
    } catch (err) {
      console.error('Error deleting product:', err)
    } finally {
      setDeleting(false)
    }
  }

  const calculateAverageRating = () => {
    if (!product || !product.ratings || !Array.isArray(product.ratings) || product.ratings.length === 0) return 0
    const sum = product.ratings.reduce((acc, curr) => acc + (curr.rating || 0), 0)
    return (sum / product.ratings.length).toFixed(1)
  }

  const averageRating = calculateAverageRating()

  const getStockStatus = () => {
    const stock = product.stock || 0
    const threshold = product.lowStockThreshold || 5
    if (stock <= 0) return { label: 'Out of Stock', class: 'out-of-stock' }
    if (stock <= threshold) return { label: 'Low Stock', class: 'low-stock' }
    return { label: 'In Stock', class: 'in-stock' }
  }

  const stockStatus = getStockStatus()

  return (
    <>
      <div className={`product-card ${stockStatus.class}`} onClick={() => !canManage && setShowDetailsModal(true)}>
        <div className="product-image-container">
          <img 
            src={product.imageUrl || 'https://via.placeholder.com/400?text=No+Image'} 
            alt={product.name} 
            className="product-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400?text=No+Image'
            }}
          />
          <span className={`stock-badge ${stockStatus.class}`}>{stockStatus.label}</span>
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          {product.storeName && <p className="product-store">{product.storeName}</p>}
          <div className="product-rating">
            <span className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= averageRating ? 'star filled' : 'star'}>
                  ★
                </span>
              ))}
            </span>
            <span className="rating-value">({averageRating})</span>
          </div>
          {canManage && product.stock !== undefined && (
            <p className="product-stock">Stock: {product.stock}</p>
          )}
        </div>

        {canManage && (
          <div className="admin-actions">
            <button
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation()
                onEditProduct && onEditProduct(product)
              }}
              title="Edit product"
            >
              Edit
            </button>
            <button
              className="btn btn-danger"
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteProduct()
              }}
              disabled={deleting}
              title="Delete product"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={showDetailsModal}
        product={product}
        onClose={() => setShowDetailsModal(false)}
      />
    </>
  )
}
