import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { SellerStoreModal } from './SellerStoreModal'
import '../css/ProductDetailsModal.css'

export function ProductDetailsModal({ isOpen, product, onClose }) {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  const [showSellerStore, setShowSellerStore] = useState(false)
  const [sellerData, setSellerData] = useState(null)
  const [loadingSellerData, setLoadingSellerData] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [storeRating, setStoreRating] = useState(0)
  const [hoverStoreRating, setHoverStoreRating] = useState(0)
  const [submittingStoreRating, setSubmittingStoreRating] = useState(false)
  const [buyQuantity, setBuyQuantity] = useState(1)

  useEffect(() => {
    if (isOpen && product?.sellerId) {
      fetchSellerData()
      setBuyQuantity(1) // Reset quantity to 1 when opening
    }
  }, [isOpen, product?.sellerId])

  const fetchSellerData = async () => {
    try {
      setLoadingSellerData(true)
      const sellerDocRef = doc(db, 'users', product.sellerId)
      const sellerDocSnap = await getDoc(sellerDocRef)
      if (sellerDocSnap.exists()) {
        setSellerData(sellerDocSnap.data())
      }
    } catch (err) {
      console.error('Error fetching seller data:', err)
    } finally {
      setLoadingSellerData(false)
    }
  }

  const handleRateProduct = async (rating) => {
    if (!user) {
      alert('Please login to rate this product')
      navigate('/login')
      onClose()
      return
    }

    try {
      setSubmittingRating(true)
      const productRef = doc(db, 'products', product.id)
      
      // Check if user already rated
      const productSnap = await getDoc(productRef)
      if (productSnap.exists()) {
        const currentData = productSnap.data()
        const existingRating = currentData.ratings?.find(r => r.userId === user.uid)
        if (existingRating) {
          alert('You have already rated this product.')
          setSubmittingRating(false)
          return
        }
      }

      await updateDoc(productRef, {
        ratings: arrayUnion({
          userId: user.uid,
          rating: rating,
          createdAt: new Date().toISOString()
        })
      })
      setUserRating(rating)
      alert('Thank you for rating this product!')
    } catch (err) {
      console.error('Error rating product:', err)
      alert(`Failed to submit rating: ${err.message}. Please ensure you have applied the latest Firestore rules.`)
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleRateStore = async (rating) => {
    if (!user) {
      alert('Please login to rate this store')
      navigate('/login')
      onClose()
      return
    }

    try {
      setSubmittingStoreRating(true)
      const sellerRef = doc(db, 'users', product.sellerId)
      
      // Check if user already rated
      const sellerSnap = await getDoc(sellerRef)
      if (sellerSnap.exists()) {
        const currentData = sellerSnap.data()
        const existingRating = currentData.storeRatings?.find(r => r.userId === user.uid)
        if (existingRating) {
          alert('You have already rated this store.')
          setSubmittingStoreRating(false)
          return
        }
      }

      await updateDoc(sellerRef, {
        storeRatings: arrayUnion({
          userId: user.uid,
          rating: rating,
          createdAt: new Date().toISOString()
        })
      })
      setStoreRating(rating)
      alert('Thank you for rating this store!')
    } catch (err) {
      console.error('Error rating store:', err)
      alert(`Failed to submit store rating: ${err.message}. Please ensure you have applied the latest Firestore rules.`)
    } finally {
      setSubmittingStoreRating(false)
    }
  }

  if (!isOpen || !product) return null

  const averageRating = product.ratings?.length 
    ? (product.ratings.reduce((acc, curr) => acc + curr.rating, 0) / product.ratings.length).toFixed(1)
    : 0

  const storeAverageRating = sellerData?.storeRatings?.length
    ? (sellerData.storeRatings.reduce((acc, curr) => acc + curr.rating, 0) / sellerData.storeRatings.length).toFixed(1)
    : 0

  const getStockStatus = () => {
    const stock = product.stock || 0
    const threshold = product.lowStockThreshold || 5
    if (stock <= 0) return { label: 'Out of Stock', class: 'out-of-stock' }
    if (stock <= threshold) return { label: 'Low Stock', class: 'low-stock' }
    return { label: 'In Stock', class: 'in-stock' }
  }

  const stockStatus = getStockStatus()

  const handleAddToCart = (product, quantity = 1) => {
    if (!user) {
      navigate('/login')
      onClose()
      return
    }

    if (isAdding) return

    setIsAdding(true)
    addToCart(product, quantity)

    setTimeout(() => {
      setIsAdding(false)
      onClose()
    }, 800)
  }

  return (
    <>
      {/* Blur Overlay */}
      <div className="product-details-blur" onClick={onClose} />

      {/* Modal */}
      <div className="product-details-modal">
        <button className="modal-close-btn" onClick={onClose} title="Close">
          ✕
        </button>

        <div className="product-details-container">
          {/* Left Side - Image */}
          <div className="product-details-image-section">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="product-details-image"
              />
            )}
          </div>

          {/* Right Side - Details */}
          <div className="product-details-info">
            <h2 className="product-details-name">{product.name}</h2>
            
            <div className="product-details-rating-display">
              <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= averageRating ? 'star filled' : 'star'}>★</span>
                ))}
              </div>
              <span className="rating-text">({averageRating}) • {product.ratings?.length || 0} reviews</span>
            </div>

            {product.storeName && <p className="product-details-stock">Sold by {product.storeName}</p>}

            <div className="rate-product-section">
              <p>Rate this product:</p>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${star <= (hoverRating || userRating) ? 'filled' : ''}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRateProduct(star)}
                    disabled={submittingRating}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="product-details-price-row">
              <span className="product-details-price">₱{Number(product.price || 0).toLocaleString()}</span>
              <span className={`stock-status-details ${stockStatus.class}`}>
                {stockStatus.label}
              </span>
            </div>

            <p className="product-details-description">
              {product.description || 'No description available for this bamboo masterpiece.'}
            </p>

            {/* Seller Store Info Section */}
            {sellerData && (
              <div className="seller-info-section">
                <h4>Store Information</h4>
                <div className="seller-card">
                  {sellerData.storePhotoUrl && (
                    <img
                      src={sellerData.storePhotoUrl}
                      alt={sellerData.storeName}
                      className="seller-store-photo"
                      onClick={() => setShowSellerStore(true)}
                      title="View full store"
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  <div className="seller-details">
                    <p className="seller-name">{sellerData.storeName || product.storeName}</p>
                    <div className="store-rating-display">
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={star <= storeAverageRating ? 'star filled' : 'star'}>★</span>
                        ))}
                      </div>
                      <span className="rating-text">({storeAverageRating})</span>
                    </div>
                    
                    <div className="rate-store-mini">
                      <span>Rate store: </span>
                      <div className="rating-input-mini">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            className={`star-btn-mini ${star <= (hoverStoreRating || storeRating) ? 'filled' : ''}`}
                            onMouseEnter={() => setHoverStoreRating(star)}
                            onMouseLeave={() => setHoverStoreRating(0)}
                            onClick={() => handleRateStore(star)}
                            disabled={submittingStoreRating}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn-view-store"
                      onClick={() => setShowSellerStore(true)}
                    >
                      👁️ View Store
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="product-details-actions">
              <div className="quantity-selector">
                <button 
                  className="qty-btn"
                  onClick={() => setBuyQuantity(Math.max(1, buyQuantity - 1))}
                  disabled={product.stock <= 0}
                >
                  −
                </button>
                <input 
                  type="number" 
                  className="qty-input"
                  value={buyQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) {
                      setBuyQuantity(Math.min(Math.max(1, val), product.stock || 0))
                    }
                  }}
                  min="1"
                  max={product.stock || 0}
                />
                <button 
                  className="qty-btn"
                  onClick={() => setBuyQuantity(Math.min(product.stock || 0, buyQuantity + 1))}
                  disabled={product.stock <= 0 || buyQuantity >= product.stock}
                >
                  +
                </button>
              </div>

              <button
                className={`btn-add-to-cart ${product.stock <= 0 ? 'btn-disabled' : ''}`}
                onClick={() => handleAddToCart(product, buyQuantity)}
                disabled={isAdding || product.stock <= 0}
              >
                {product.stock <= 0 ? 'Out of Stock' : isAdding ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Store Modal */}
      {sellerData && (
        <SellerStoreModal
          isOpen={showSellerStore}
          sellerId={product.sellerId}
          storeName={sellerData.storeName || product.storeName}
          storePhotoUrl={sellerData.storePhotoUrl}
          onClose={() => setShowSellerStore(false)}
        />
      )}
    </>
  )
}
