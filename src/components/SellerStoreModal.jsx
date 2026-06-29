import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ProductDetailsModal } from './ProductDetailsModal'
import { rateStore, calculateAverageRating, formatPrice } from '../utils/rating'
import { ArrowLeft, MessageCircle, ShoppingCart, User, X } from 'lucide-react'
import { Toast } from './Toast'
import '../css/SellerStoreModal.css'

export function SellerStoreModal({ isOpen, sellerId, storeName, storePhotoUrl, onClose }) {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [sellerProducts, setSellerProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [sellerData, setSellerData] = useState(null)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [allCategories, setAllCategories] = useState([])
  const [selectedCategory, setSelectedTabCategory] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showProductDetails, setShowProductDetails] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  useEffect(() => {
    if (isOpen && sellerId) {
      fetchSellerProducts()
      fetchSellerData()
      fetchAllCategories()
    }
  }, [isOpen, sellerId])

  const fetchAllCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'))
      const categoriesList = []
      querySnapshot.forEach((doc) => {
        categoriesList.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      setAllCategories(categoriesList)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchSellerData = async () => {
    try {
      const sellerDocRef = doc(db, 'users', sellerId)
      const sellerDocSnap = await getDoc(sellerDocRef)
      if (sellerDocSnap.exists()) {
        const data = sellerDocSnap.data()
        setSellerData(data)
        // Set user's previous rating if any
        if (user && data.storeRatings) {
          const myRating = data.storeRatings.find(r => r.userId === user.uid)
          if (myRating) setUserRating(myRating.rating)
        }
      }
    } catch (err) {
      console.error('Error fetching seller data:', err)
    }
  }

  const handleRateStore = async (rating) => {
    if (!user) {
      setToastMessage('Please login to rate this store')
      setToastType('info')
      return
    }

    try {
      setSubmittingRating(true)
      await rateStore(sellerId, user.uid, rating)
      setUserRating(rating)
      // Refresh seller data to show new rating
      fetchSellerData()
      setToastMessage('Thank you for rating this store!')
      setToastType('success')
    } catch (err) {
      setToastMessage(`Failed to submit store rating: ${err.message}`)
      setToastType('error')
    } finally {
      setSubmittingRating(false)
    }
  }

  const fetchSellerProducts = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'products'), where('sellerId', '==', sellerId))
      const querySnapshot = await getDocs(q)
      const products = []
      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      setSellerProducts(products)
    } catch (err) {
      console.error('Error fetching seller products:', err)
      setSellerProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (e, product) => {
    e.stopPropagation() // Prevent modal close if overlay is clicked
    if (!user) {
      setToastMessage('Please login to add items to cart')
      setToastType('info')
      return
    }
    
    // Add to cart with quantity 1
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      sellerId: product.sellerId
    }, 1)
    
    setToastMessage(`✓ Added ${product.name} to cart!`)
    setToastType('success')
    console.log('✓ Added to cart:', product.name)
  }

  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setShowProductDetails(true)
  }

  const calculateProductAverageRating = (product) => {
    if (!product || !product.ratings || !Array.isArray(product.ratings) || product.ratings.length === 0) return 0
    const sum = product.ratings.reduce((acc, curr) => acc + (curr.rating || 0), 0)
    return (sum / product.ratings.length).toFixed(1)
  }

  const averageRating = calculateAverageRating(sellerData?.storeRatings)
  const displayStorePhoto = sellerData?.storePhotoUrl || storePhotoUrl

  // Use all categories from admin
  const storeCategories = [
    { id: 'all', name: 'ALL' },
    ...allCategories
  ]

  const filteredDisplayProducts = sellerProducts.filter(product => {
    if (activeTab === 'home') return true // Show all on home for now or first 8
    if (activeTab === 'all') return true
    if (activeTab === 'categories') {
      return selectedCategory === 'all' || product.category === selectedCategory
    }
    return true
  })

  // Helper to get category name by ID
  const getCategoryName = (id) => {
    if (id === 'all') return 'All Categories'
    const cat = allCategories.find(c => c.id === id)
    return cat ? cat.name : id
  }

  if (!isOpen) return null

  return (
    <>
      {/* Blur Overlay */}
      <div className="seller-store-blur" onClick={onClose} />

      {/* Modal */}
      <div className="seller-store-modal shopee-style">
        {/* Back Button - Modern UI */}
        <button 
          className="back-to-shop-btn" 
          onClick={onClose} 
          title="Back to Store"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button className="modal-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        {/* Store Header - Shopee Style */}
        <div className="shopee-store-header">
          <div className="shopee-header-bg">
            <div className="shopee-header-overlay"></div>
          </div>
          <div className="shopee-store-info">
            <div className="shopee-store-avatar">
              {displayStorePhoto ? (
                <img src={displayStorePhoto} alt={storeName} />
              ) : (
                <div className="shopee-avatar-placeholder">
                  <User size={42} />
                </div>
              )}
            </div>
            <div className="shopee-store-details">
              <h2 className="shopee-store-name">{storeName}</h2>
              <div className="shopee-store-stats">
                <div className="stat-item">
                  <span className="stat-value">⭐ {averageRating}</span>
                  <span className="stat-label">Rating</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{sellerProducts.length}</span>
                  <span className="stat-label">Products</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {sellerData?.createdAt 
                      ? (sellerData.createdAt.toDate 
                          ? sellerData.createdAt.toDate().toLocaleDateString() 
                          : new Date(sellerData.createdAt).toLocaleDateString())
                      : 'N/A'}
                  </span>
                  <span className="stat-label">Joined</span>
                </div>
              </div>
              <div className="shopee-store-actions">
                <div className="shopee-rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`shopee-star-btn ${star <= (hoverRating || userRating) ? 'filled' : ''}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRateStore(star)}
                      disabled={submittingRating}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <button
                  className="shopee-message-btn"
                  onClick={() => {
                    onClose(); // Close modal first
                    navigate('/chat', { state: { sellerId } });
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#EE4D2D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <MessageCircle size={15} />
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Store Navigation Tabs */}
        <div className="shopee-store-tabs">
          <button 
            className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button 
            className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Products
          </button>
          <button 
            className={`tab-item ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </button>
        </div>

        {/* Products Section */}
        <div className="shopee-store-content">
          {activeTab === 'categories' && (
            <div className="store-category-filters" style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
              {storeCategories.map(cat => (
                <button
                  key={cat.id}
                  className={`category-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedTabCategory(cat.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '50px',
                    border: '1px solid #ddd',
                    background: selectedCategory === cat.id ? '#1b4332' : 'white',
                    color: selectedCategory === cat.id ? 'white' : '#666',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem'
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <div className="shopee-section-title">
            <h3>
              {activeTab === 'home' && 'Recommended for You'}
              {activeTab === 'all' && 'All Products'}
              {activeTab === 'categories' && (selectedCategory === 'all' ? 'All Categories' : `Category: ${getCategoryName(selectedCategory)}`)}
            </h3>
          </div>

          {loading && (
            <div className="shopee-loading">
              <div className="spinner"></div>
              <p>Loading products...</p>
            </div>
          )}

          {!loading && filteredDisplayProducts.length === 0 && (
            <div className="shopee-empty">
              <span className="empty-icon">🛍️</span>
              <p>No products found.</p>
            </div>
          )}

          {!loading && filteredDisplayProducts.length > 0 && (
            <div className="shopee-products-grid">
              {filteredDisplayProducts.map((product) => {
                const productRating = calculateProductAverageRating(product)
                return (
                  <div key={product.id} className="shopee-product-card" onClick={() => handleProductClick(product)}>
                    <div className="shopee-product-image">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.name} />
                      )}
                      {product.stock <= 0 && <div className="sold-out-overlay">Sold Out</div>}
                    </div>
                    <div className="shopee-product-info">
                      <h4 className="shopee-product-name">{product.name}</h4>
                      <div className="shopee-product-rating">
                        <span className="shopee-stars">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`shopee-star ${star <= productRating ? 'filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </span>
                        <span className="shopee-rating-value">({productRating})</span>
                      </div>
                      <div className="product-price-row">
                        <span className="price-value">{formatPrice(product.price)}</span>
                      </div>
                      <div className="product-bottom-row">
                        <span className="stock-info">{product.stock} in stock</span>
                        {product.stock > 0 && (
                          <button
                            className="shopee-cart-btn"
                            onClick={(e) => handleAddToCart(e, product)}
                            title="Add to Cart"
                          >
                            <ShoppingCart size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          isOpen={showProductDetails}
          product={selectedProduct}
          onClose={() => {
            setShowProductDetails(false)
            setSelectedProduct(null)
          }}
        />
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
