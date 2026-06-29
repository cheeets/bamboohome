import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Toast } from '../components/Toast'
import { formatPrice } from '../utils/rating'
import '../css/CheckoutPage.css'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, getTotalPrice, clearCart, updateQuantity, updateItemPrice } = useCart()
  const { user, userRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [priceChanges, setPriceChanges] = useState([])
  const [showPriceWarning, setShowPriceWarning] = useState(false)
  const [checkingPrices, setCheckingPrices] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  // Silently redirect admin users away from checkout page
  useEffect(() => {
    if (user && userRole === 'admin') {
      navigate('/', { replace: true })
    }
  }, [user, userRole, navigate])

  // Check for price changes when checkout page loads
  useEffect(() => {
    const checkPriceChanges = async () => {
      if (cart.length === 0) {
        setCheckingPrices(false)
        return
      }

      try {
        const changes = []

        for (const item of cart) {
          const productsRef = collection(db, 'products')
          const q = query(productsRef, where('__name__', '==', item.id))
          const snapshot = await getDocs(q)

          // `q` already filters by document id, so only one match is expected.
          const currentDoc = snapshot.docs[0]
          const currentProduct = currentDoc ? { id: currentDoc.id, ...currentDoc.data() } : null

          if (currentProduct && currentProduct.price !== item.price) {
            changes.push({
              productId: item.id,
              productName: item.name,
              oldPrice: item.price,
              newPrice: currentProduct.price,
              quantity: item.quantity,
              oldSubtotal: item.price * item.quantity,
              newSubtotal: currentProduct.price * item.quantity,
            })
          }
        }

        if (changes.length > 0) {
          setPriceChanges(changes)
          setShowPriceWarning(true)
        }
      } catch (err) {
        console.error('Error checking price changes:', err)
      } finally {
        setCheckingPrices(false)
      }
    }

    if (cart.length > 0) {
      checkPriceChanges()
    }
  }, [cart])

  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    addressLine: '',
    notes: '',
  })

  // Calculate price differences
  const totalOldPrice = priceChanges.reduce((sum, change) => sum + change.oldSubtotal, 0)
  const totalNewPrice = priceChanges.reduce((sum, change) => sum + change.newSubtotal, 0)
  const priceDifference = totalNewPrice - totalOldPrice

  const handleAcceptPriceChange = () => {
    // Update cart items with new prices
    priceChanges.forEach((change) => {
      updateItemPrice(change.productId, change.newPrice)
    })
    // Reset price changes state to reflect new prices
    setPriceChanges([])
    setShowPriceWarning(false)
  }

  const handleRejectPriceChange = () => {
    navigate('/cart')
  }

  if (!user) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="empty-state">
            <p>Please log in to proceed with checkout</p>
            <button onClick={() => navigate('/')} className="login-btn">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="empty-state">
            <p>Your cart is empty. Add items to checkout</p>
            <button onClick={() => navigate('/')} className="continue-shopping-btn">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    )
  }


  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (cart.length === 0) {
      setError('Cart is empty')
      return
    }

    if (!formData.fullName.trim() || !formData.phoneNumber.trim() || !formData.addressLine.trim()) {
      setError('Please enter your full delivery details.')
      return
    }

    setLoading(true)

    try {
      // Validate that all items have sellerId
      const itemsWithoutSeller = cart.filter((item) => !item.sellerId)
      if (itemsWithoutSeller.length > 0) {
        console.error('Items missing sellerId:', itemsWithoutSeller)
        setError('Error: Some items are missing seller information. Please clear cart and re-add items.')
        setLoading(false)
        return
      }

      // Split checkout into multiple orders (one per seller).
      const itemsBySeller = cart.reduce((acc, item) => {
        const sellerId = item.sellerId
        if (!acc[sellerId]) acc[sellerId] = []
        acc[sellerId].push(item)
        return acc
      }, {})

      const sellerIds = Object.keys(itemsBySeller)
      console.log('Creating orders for sellers:', sellerIds)
      console.log('Items by seller:', itemsBySeller)

      if (sellerIds.length === 0) {
        setError('No valid items found in cart.')
        setLoading(false)
        return
      }

      // Pre-create order refs so we can set `orderId` deterministically inside the transaction.
      const orderRefsBySeller = sellerIds.reduce((acc, sellerId) => {
        acc[sellerId] = doc(collection(db, 'orders'))
        return acc
      }, {})

      await runTransaction(db, async (transaction) => {
        // 1) Perform all READS first (required by Firestore transactions)
        const productSnapshots = []
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id)
          const productSnap = await transaction.get(productRef)
          
          if (!productSnap.exists()) {
            throw new Error(`Product not found: ${item.name}`)
          }
          
          productSnapshots.push({
            item,
            ref: productRef,
            snap: productSnap
          })
        }

        // 2) Perform all WRITES after all reads
        
        // Update inventory for all products
        for (const { item, ref, snap } of productSnapshots) {
          const currentStock = snap.data().stock ?? 0
          if (currentStock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}. Available: ${currentStock}`)
          }

          transaction.update(ref, {
            stock: currentStock - item.quantity,
          })
        }

        // Create one order per seller.
        for (const sellerId of sellerIds) {
          const items = itemsBySeller[sellerId] || []
          const orderRef = orderRefsBySeller[sellerId]

          const products = items.map((item) => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.imageUrl || item.image,
          }))

          const totalAmount = products.reduce((sum, p) => sum + p.price * p.quantity, 0)

          const orderData = {
            orderId: orderRef.id,
            userId: user.uid,
            userEmail: user.email,
            sellerId,
            products,
            // Backward-compat (older UI expects `items`)
            items: products,
            totalAmount,
            address: {
              fullName: formData.fullName.trim(),
              phoneNumber: formData.phoneNumber.trim(),
              addressLine: formData.addressLine.trim(),
              notes: (formData.notes || '').trim(),
            },
            paymentMethod: 'COD',
            status: 'Pending',
            createdAt: serverTimestamp(),
          }

          transaction.set(orderRef, orderData)
        }
      })

      // Clear cart on successful transaction.
      clearCart()

      // Show toast notification
      setToastMessage('✓ Order placed successfully!')
      setToastType('success')

      // Redirect to orders page immediately while loading overlay is showing
      navigate('/orders')
    } catch (err) {
      console.error('Error placing order:', err)
      console.error('Error code:', err.code)
      console.error('Error message:', err.message)
      
      let userMessage = 'Failed to place order. Please try again.'
      
      if (err.code === 'permission-denied') {
        userMessage = 'Permission denied: You do not have access to create orders. Please try logging out and back in.'
      } else if (err.message && err.message.includes('Insufficient stock')) {
        userMessage = err.message
      } else if (err.message) {
        userMessage = err.message
      }
      
      setError(userMessage)
    } finally {
      setLoading(false)
    }
  }

  const totalPrice = getTotalPrice()

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner-large"></div>
            <h2>Processing Your Order</h2>
            <p>Please wait while we secure your order...</p>
          </div>
        </div>
      )}

      {/* Price Change Warning Modal */}
      {showPriceWarning && priceChanges.length > 0 && (
        <div className="modal-overlay" onClick={handleRejectPriceChange}>
          <div className="modal-content price-warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Price Change Alert</h3>
              <button
                className="modal-close"
                onClick={handleRejectPriceChange}
              >
                ✕
              </button>
            </div>

            <div className="price-warning-content">
              <p>We've detected price changes in your cart since you added these items. Here's what changed:</p>

              <div className="price-changes-list">
                {priceChanges.map((change) => (
                  <div key={change.productId} className="price-change-item">
                    <div className="price-change-info">
                      <p className="product-name">{change.productName}</p>
                      <p className="price-change-details">
                        Qty: {change.quantity} | Old: {formatPrice(change.oldPrice)} → New: {formatPrice(change.newPrice)}
                      </p>
                    </div>
                    <div className="price-change-amount">
                      <p className="old-subtotal">{formatPrice(change.oldSubtotal)}</p>
                      <p className={`new-subtotal ${change.newPrice > change.oldPrice ? 'price-increase' : 'price-decrease'}`}>
                        {formatPrice(change.newSubtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="price-warning-summary">
                <div className="summary-row">
                  <span>Original Total:</span>
                  <span className="old-price">{formatPrice(getTotalPrice() - priceDifference)}</span>
                </div>
                <div className="summary-row">
                  <span>New Total:</span>
                  <span className={`new-price ${priceDifference > 0 ? 'price-increase' : 'price-decrease'}`}>
                    {formatPrice(getTotalPrice())}
                  </span>
                </div>
                {priceDifference !== 0 && (
                  <div className="summary-row difference">
                    <span>Difference:</span>
                    <span className={priceDifference > 0 ? 'price-increase' : 'price-decrease'}>
                      {priceDifference > 0 ? '+' : ''}{formatPrice(Math.abs(priceDifference))}
                    </span>
                  </div>
                )}
              </div>

              <p className="warning-message">
                You will be charged based on the <strong>current prices</strong> shown above. Would you like to proceed or go back to review your cart?
              </p>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleRejectPriceChange}
                >
                  Back to Cart
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAcceptPriceChange}
                >
                  Proceed with Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="checkout-page">
        <div className="checkout-container">
          {checkingPrices && cart.length > 0 && (
            <div className="loading-message">
              <p>Verifying product prices...</p>
            </div>
          )}

          {!checkingPrices && showPriceWarning && priceChanges.length > 0 ? null : (
            <form onSubmit={handlePlaceOrder} className="checkout-wrapper">
              {/* Left Column: Delivery Details */}
              <div className="checkout-left">
                <section className="checkout-section">
                  <h2>Delivery Details</h2>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Delivery Address</label>
                    <textarea
                      name="addressLine"
                      value={formData.addressLine}
                      onChange={handleInputChange}
                      placeholder="Enter your full address"
                      rows="4"
                      required
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label>Order Notes (Optional)</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Notes about your delivery"
                      rows="2"
                    ></textarea>
                  </div>
                </section>
              </div>

              {/* Right Column: Order Summary */}
              <div className="checkout-right">
                <div className="order-summary-box">
                  <h3 className="summary-title">Order Summary</h3>
                  
                  <div className="summary-items-list">
                    {cart.map(item => (
                      <div key={item.id} className="summary-item">
                        <span>{item.name} x {item.quantity}</span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="summary-divider"></div>
                  
                  <div className="summary-item">
                    <span>Subtotal</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                  <div className="summary-item">
                    <span>Delivery Fee</span>
                    <span>{formatPrice(0)}</span>
                  </div>

                  <div className="summary-total">
                    <span>Total</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>

                  {error && <p className="error-text" style={{ color: 'var(--danger)', marginTop: '20px', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>{error}</p>}

                  <button 
                    type="submit" 
                    className="btn-place-order"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
