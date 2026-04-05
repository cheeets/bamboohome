import React, { useState, useEffect } from 'react'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import '../css/SellerStoreModal.css'

export function SellerStoreModal({ isOpen, sellerId, storeName, storePhotoUrl, onClose }) {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const [sellerProducts, setSellerProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [sellerData, setSellerData] = useState(null)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [selectedCategory, setSelectedTabCategory] = useState('all')

  const lastFetchedSellerId = React.useRef(null)

  useEffect(() => {
    if (isOpen && sellerId && lastFetchedSellerId.current !== sellerId) {
      fetchSellerProducts()
      fetchSellerData()
      lastFetchedSellerId.current = sellerId
    }
  }, [isOpen, sellerId])

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
      alert('Please login to rate this store')
      return
    }

    try {
      setSubmittingRating(true)
      const sellerRef = doc(db, 'users', sellerId)
      
      // Check if user already rated
      const sellerSnap = await getDoc(sellerRef)
      if (sellerSnap.exists()) {
        const currentData = sellerSnap.data()
        const existingRating = currentData.storeRatings?.find(r => r.userId === user.uid)
        if (existingRating) {
          alert('You have already rated this store.')
          setSubmittingRating(false)
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
      setUserRating(rating)
      // Refresh seller data to show new rating
      fetchSellerData()
      alert('Thank you for rating this store!')
    } catch (err) {
      console.error('Error rating store:', err)
      alert(`Failed to submit store rating: ${err.message}`)
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
      alert('Please login to add items to cart')
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
    
    alert(`✓ Added ${product.name} to cart!`)
    console.log('✓ Added to cart:', product.name)
  }

  const calculateAverageRating = () => {
    if (!sellerData?.storeRatings || sellerData.storeRatings.length === 0) return 0
    const sum = sellerData.storeRatings.reduce((acc, curr) => acc + curr.rating, 0)
    return (sum / sellerData.storeRatings.length).toFixed(1)
  }

  const averageRating = calculateAverageRating()

  // Get unique categories from seller products
  const storeCategories = ['all', ...new Set(sellerProducts.map(p => p.category).filter(Boolean))]

  const filteredDisplayProducts = sellerProducts.filter(product => {
    if (activeTab === 'home') return true // Show all on home for now or first 8
    if (activeTab === 'all') return true
    if (activeTab === 'categories') {
      return selectedCategory === 'all' || product.category === selectedCategory
    }
    return true
  })

  if (!isOpen) return null

  return (
    <>
      {/* Blur Overlay */}
      <div className="seller-store-blur" onClick={onClose} />

      {/* Modal */}
      <div className="seller-store-modal shopee-style">
        <button className="modal-close-btn" onClick={onClose} title="Close">
          ✕
        </button>

        {/* Store Header - Shopee Style */}
        <div className="shopee-store-header">
          <div className="shopee-header-bg">
            <div className="shopee-header-overlay"></div>
          </div>
          <div className="shopee-store-info">
            <div className="shopee-store-avatar">
              {storePhotoUrl ? (
                <img src={storePhotoUrl} alt={storeName} />
              ) : (
                <div className="shopee-avatar-placeholder">👤</div>
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
                  <span className="stat-value">Joined</span>
                  <span className="stat-label">{sellerData?.createdAt ? new Date(sellerData.createdAt).toLocaleDateString() : 'N/A'}</span>
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
                  key={cat}
                  className={`category-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedTabCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '50px',
                    border: '1px solid #ddd',
                    background: selectedCategory === cat ? '#1b4332' : 'white',
                    color: selectedCategory === cat ? 'white' : '#666',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="shopee-section-title">
            <h3>
              {activeTab === 'home' && 'Recommended for You'}
              {activeTab === 'all' && 'All Products'}
              {activeTab === 'categories' && (selectedCategory === 'all' ? 'All Categories' : `Category: ${selectedCategory}`)}
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
              {filteredDisplayProducts.map((product) => (
                <div key={product.id} className="shopee-product-card">
                  <div className="shopee-product-image">
                    {product.imageUrl && (
                      <img src={product.imageUrl} alt={product.name} />
                    )}
                    {product.stock <= 0 && <div className="sold-out-overlay">Sold Out</div>}
                  </div>
                  <div className="shopee-product-info">
                    <h4 className="product-name">{product.name}</h4>
                    <div className="product-price-row">
                      <span className="currency">₱</span>
                      <span className="price-value">{product.price.toFixed(2)}</span>
                    </div>
                    <div className="product-bottom-row">
                      <span className="stock-info">{product.stock} in stock</span>
                      {product.stock > 0 && (
                        <button
                          className="shopee-cart-btn"
                          onClick={(e) => handleAddToCart(e, product)}
                          title="Add to Cart"
                        >
                          🛒
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
