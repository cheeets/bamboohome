import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import '../css/CartPage.css'

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalPrice } = useCart()
  const { user, userRole } = useAuth()
  const navigate = useNavigate()

  // Silently redirect admin users away from cart page
  useEffect(() => {
    if (user && userRole === 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userRole, navigate])

  if (!user) {
    return (
      <div className="cart-container">
        <div className="cart-wrapper">
          <div className="login-prompt">
            <h2>Please log in to view your cart</h2>
            <button onClick={() => navigate('/login')} className="btn btn-primary">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="cart-container">
        <div className="cart-wrapper">
          <div className="empty-cart">
            <h2>Your cart is waiting for its first item</h2>
            <button onClick={() => navigate('/')} className="btn btn-primary">
              Go to Shop
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-container">
      <div className="cart-wrapper">
        {/* <div className="cart-header">
          <h1>Shopping Cart</h1>
          <p className="item-count">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
        </div> */}
        <div className="cart-content">
          <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <button
                className="btn-remove-item"
                onClick={() => removeFromCart(item.id)}
                title="Remove from cart"
              >
                ✕
              </button>

              <div className="item-image">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} />
                )}
              </div>

              <div className="item-details">
                <h3 className="item-name">{item.name}</h3>
                <p className="item-price">₱{item.price.toFixed(2)}</p>
              </div>

              <div className="item-quantity">
                <div className="quantity-control">
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    
                    className="qty-input"
                  />
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="item-subtotal">
                {/* <p className="subtotal-label">Subtotal:</p>
                <p className="subtotal-price">₱{(item.price * item.quantity).toFixed(2)}</p> */}
              </div>
            </div>
          ))}
        </div>
        <div className="cart-summary">
          {/* <h2>Order Summary</h2>
          
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>₱{getTotalPrice().toFixed(2)}</span>
          </div>

          <div className="summary-divider"></div> */}

          <div className="summary-row total">
            <span>Total:</span>
            <span>₱{getTotalPrice().toFixed(2)}</span>
          </div>

          <button className="btn btn-primary btn-checkout" onClick={() => navigate('/checkout')}>
            Proceed to Checkout
          </button>

          {/* <button
            className="btn  btn-continue"
            onClick={() => navigate('/')}
          >
            Continue Shopping
          </button> */}
        </div>
      </div>
      </div>
    </div>
  )
}
