import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { rateStore, calculateAverageRating, getStockStatus, formatPrice } from '../utils/rating'
import { MessageCircle, Minus, Plus, ShoppingCart, X, Flag } from 'lucide-react'
import { Toast } from './Toast'
import '../css/ProductDetailsModal.css'

export function ProductDetailsModal({ isOpen, product, onClose }) {
  const { user, userRole } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  const [sellerData, setSellerData] = useState(null)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [storeRating, setStoreRating] = useState(0)
  const [hoverStoreRating, setHoverStoreRating] = useState(0)
  const [submittingStoreRating, setSubmittingStoreRating] = useState(false)
  const [buyQuantity, setBuyQuantity] = useState(1)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  useEffect(() => {
    if (isOpen && product?.sellerId) {
      fetchSellerData()
      setBuyQuantity(1) // Reset quantity to 1 when opening
    }
  }, [isOpen, product?.sellerId])

  const fetchSellerData = async () => {
    try {
      const sellerDocRef = doc(db, 'users', product.sellerId)
      const sellerDocSnap = await getDoc(sellerDocRef)
      if (sellerDocSnap.exists()) {
        setSellerData(sellerDocSnap.data())
      }
    } catch (err) {
      console.error('Error fetching seller data:', err)
    }
  }

  const handleRateProduct = async (rating) => {
    if (!user) {
      setToastMessage('Please login to rate this product')
      setToastType('info')
      navigate('/')
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
          setToastMessage('You have already rated this product.')
          setToastType('info')
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
      setToastMessage('Thank you for rating this product!')
      setToastType('success')
    } catch (err) {
      console.error('Error rating product:', err)
      setToastMessage(`Failed to submit rating: ${err.message}. Please ensure you have applied the latest Firestore rules.`)
      setToastType('error')
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleRateStore = async (rating) => {
    if (!user) {
      setToastMessage('Please login to rate this store')
      setToastType('info')
      navigate('/')
      onClose()
      return
    }

    try {
      setSubmittingStoreRating(true)
      const success = await rateStore(product.sellerId, user.uid, rating)
      if (success) {
        setStoreRating(rating)
        setToastMessage('Thank you for rating this store!')
        setToastType('success')
        // Refresh seller data to show new rating
        fetchSellerData()
      }
    } catch (err) {
      console.error('Error rating store:', err)
      setToastMessage(`Failed to submit store rating: ${err.message}. Please ensure you have applied the latest Firestore rules.`)
      setToastType('error')
    } finally {
      setSubmittingStoreRating(false)
    }
  }

  const handleReportStore = async () => {
    if (!user) {
      setToastMessage('Please login to report a store')
      setToastType('info')
      return
    }

    if (!reportReason.trim()) {
      setToastMessage('Please select a reason for reporting')
      setToastType('info')
      return
    }

    try {
      setSubmittingReport(true)
      await addDoc(collection(db, 'reports'), {
        reportedBy: user.uid,
        reporterEmail: user.email,
        reporterName: user.displayName || user.email,
        sellerId: product.sellerId,
        sellerEmail: sellerData?.email || 'Unknown',
        storeName: product.storeName || sellerData?.storeName || 'Unknown Store',
        productId: product.id,
        productName: product.name,
        reason: reportReason,
        details: reportDetails.trim() || 'No additional details provided',
        status: 'pending',
        createdAt: serverTimestamp(),
        reviewed: false
      })
      
      setToastMessage('Report submitted successfully. Admin will review it soon.')
      setToastType('success')
      setShowReportModal(false)
      setReportReason('')
      setReportDetails('')
    } catch (err) {
      console.error('Error submitting report:', err)
      setToastMessage('Failed to submit report. Please try again.')
      setToastType('error')
    } finally {
      setSubmittingReport(false)
    }
  }

  if (!isOpen || !product) return null

  const averageRating = product.ratings?.length 
    ? (product.ratings.reduce((acc, curr) => acc + curr.rating, 0) / product.ratings.length).toFixed(1)
    : 0

  const storeAverageRating = calculateAverageRating(sellerData?.storeRatings)

  const stockStatus = getStockStatus(product)

  const handleAddToCart = async (product, quantity = 1) => {
    if (!user) {
      setToastMessage('Please login to add items to cart')
      setToastType('info')
      navigate('/')
      onClose()
      return
    }

    if (userRole === 'seller' || userRole === 'admin') {
      setToastMessage('Sellers and admins cannot add items to cart')
      setToastType('info')
      return
    }

    if (isAdding || !product || quantity < 1) return

    try {
      setIsAdding(true)
      addToCart(product, quantity)
      onClose()
    } catch (err) {
      console.error('Error adding to cart:', err)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      {/* Blur Overlay */}
      <div className="product-details-blur" onClick={onClose} />

      {/* Modal */}
      <div className="product-details-modal">
        <button className="modal-close-btn" onClick={onClose} title="Close">
          <X size={20} />
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

            {product.storeName && <p className="product-details-seller">Sold by {product.storeName}</p>}

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
              <span className="product-details-price">{formatPrice(product.price)}</span>
              <span className={`stock-status-details ${stockStatus.class}`}>
                {stockStatus.label}
              </span>
            </div>

            <div className="product-stock-summary">
              <span className="product-stock-label">Available Stocks</span>
              <span className="product-stock-value">{product.stock ?? 0}</span>
            </div>

            <div className="product-details-description-card">
              <h4>Description</h4>
              <p className="product-details-description">
                {product.description || 'No description available for this product.'}
              </p>
            </div>

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
                      className="btn-message-seller"
                      onClick={() => navigate('/chat', { state: { sellerId: product.sellerId } })}
                    >
                      <MessageCircle size={14} />
                      Message Seller
                    </button>
                    
                    <button
                      className="btn-report-store"
                      onClick={() => setShowReportModal(true)}
                    >
                      <Flag size={14} />
                      Report Store
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="product-details-actions">
              <span className="quantity-label">Quantity</span>
              <div className="product-details-cart-row">
                <div className="quantity-selector">
                  <button 
                    className="qty-btn"
                    onClick={() => setBuyQuantity(Math.max(1, buyQuantity - 1))}
                    disabled={product.stock <= 0}
                  >
                    <Minus size={16} />
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
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  className={`btn-add-to-cart ${product.stock <= 0 ? 'btn-disabled' : ''}`}
                  onClick={() => handleAddToCart(product, buyQuantity)}
                  disabled={isAdding || product.stock <= 0}
                >
                  <ShoppingCart size={16} />
                  {product.stock <= 0 ? 'Out of Stock' : isAdding ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="pd-report-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="pd-report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pd-report-modal-header">
              <h3><Flag size={20} /> Report Store</h3>
              <button onClick={() => setShowReportModal(false)}><X size={20} /></button>
            </div>
            <div className="pd-report-modal-body">
              <p className="pd-report-store-name">Reporting: <strong>{product.storeName}</strong></p>
              
              <div className="pd-form-group">
                <label>Reason for Report *</label>
                <select 
                  value={reportReason} 
                  onChange={(e) => setReportReason(e.target.value)}
                  className="pd-report-select"
                >
                  <option value="">Select a reason...</option>
                  <option value="Counterfeit Products">Fake Products</option>
                  <option value="Misleading Information">Misleading Product Information</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pd-form-group">
                <label>Additional Details (Optional)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Please provide any additional information that will help us investigate..."
                  rows="4"
                  className="pd-report-textarea"
                  maxLength="500"
                />
                <span className="pd-char-count">{reportDetails.length}/500</span>
              </div>

              <div className="pd-report-warning">
                <strong>Note:</strong> False reports may result in account suspension. Please only report genuine concerns.
              </div>
            </div>
            <div className="pd-report-modal-footer">
              <button 
                className="pd-btn-cancel" 
                onClick={() => setShowReportModal(false)}
                disabled={submittingReport}
              >
                Cancel
              </button>
              <button 
                className="pd-btn-submit-report" 
                onClick={handleReportStore}
                disabled={submittingReport || !reportReason}
              >
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}
    </>
  )
}
