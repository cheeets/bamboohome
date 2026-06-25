import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ProductDetailsModal } from './ProductDetailsModal'
import { SellerStoreModal } from './SellerStoreModal'
import { calculateAverageRating, getStockStatus, formatPrice } from '../utils/rating'
import { Eye, Minus, Plus, ShoppingCart, Store } from 'lucide-react'
import '../css/ProductCard.css'

export function ProductCard({ product, onProductUpdated, onEditProduct, onViewDetails, showManagementActions = false, variant = 'default' }) {
  const { user, userRole } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showSellerStore, setShowSellerStore] = useState(false)
  const [buyQuantity, setBuyQuantity] = useState(1)

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

  const averageRating = calculateAverageRating(product.ratings)

  const stockStatus = getStockStatus(product)
  const maxStock = Number(product.stock) || 0

  const handleAddToCart = (e) => {
    e.stopPropagation()
    if (!user) {
      alert('Please login to add items to cart')
      navigate('/')
      return
    }

    if (maxStock <= 0) {
      return
    }

    addToCart(product, buyQuantity)
    alert(`Added ${product.name} to cart`)
  }

  const isShopVariant = variant === 'shop'

  return (
    <>
      <div className={`product-card ${stockStatus.class} ${isShopVariant ? 'product-card--shop' : ''}`} onClick={() => !canManage && setShowDetailsModal(true)}>
        <div className="card-image-wrapper">
          <img
            src={product.imageUrl || 'https://via.placeholder.com/400?text=No+Image'}
            alt={product.name}
            className="product-image"
            loading="lazy"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400?text=No+Image'
            }}
          />
          <span className={`stock-badge ${stockStatus.class}`}>{stockStatus.label}</span>
          {product.discount && (
            <span className="discount-badge">{product.discount}% OFF</span>
          )}
        </div>

        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <div className="product-meta-row">
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
          </div>

          <div className="product-price-row">
            <div className="product-price">{formatPrice(product.price)}</div>
            {product.originalPrice > product.price && (
              <div className="product-original-price">{formatPrice(product.originalPrice)}</div>
            )}
          </div>

          {!canManage && isShopVariant && (
            <div className="card-actions card-actions--shop">
              <button
                type="button"
                className="btn-icon-action"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSellerStore(true)
                }}
                title="View store"
              >
                <Store size={18} />
              </button>
              <button
                type="button"
                className="btn-buy"
                onClick={handleAddToCart}
                disabled={maxStock <= 0}
              >
                {maxStock <= 0 ? 'Sold Out' : 'Buy'}
              </button>
            </div>
          )}

          {!canManage && !isShopVariant && (
            <div className="card-actions">
              <div className="quick-cart-row">
                <div className="qty-selector" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="qty-ctrl-btn"
                    onClick={() => setBuyQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={maxStock <= 0}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-value">{buyQuantity}</span>
                  <button
                    className="qty-ctrl-btn"
                    onClick={() => setBuyQuantity((prev) => Math.min(maxStock || 1, prev + 1))}
                    disabled={maxStock <= 0 || buyQuantity >= maxStock}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button className="btn-add-cart" onClick={handleAddToCart} disabled={maxStock <= 0}>
                  <ShoppingCart size={16} />
                  {maxStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
              <div className="secondary-actions-row">
                <button
                  className="btn-outline-store"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSellerStore(true)
                  }}
                >
                  <Store size={16} />
                  View Store
                </button>
                <button
                  className="btn-outline-details"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDetailsModal(true)
                  }}
                >
                  <Eye size={16} />
                  View Details
                </button>
              </div>
            </div>
          )}

          {canManage && product.stock !== undefined && (
            <p className="product-stock">Stock: {product.stock}</p>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={showDetailsModal}
        product={product}
        onClose={() => setShowDetailsModal(false)}
      />

      <SellerStoreModal
        isOpen={showSellerStore}
        sellerId={product.sellerId}
        storeName={product.storeName || 'Store'}
        onClose={() => setShowSellerStore(false)}
      />
    </>
  )
}
