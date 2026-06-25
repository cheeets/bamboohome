import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { BuyerLayout } from '../components/BuyerLayout'
import { formatPrice } from '../utils/rating'
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
            <button onClick={() => navigate('/')} className="btn btn-primary">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <BuyerLayout>
        <div className="panel-header">
          <div className="panel-header-text">
            <h1>Cart</h1>
            <p>Your cart is waiting for its first item.</p>
          </div>
        </div>
        <div className="empty-cart">
          <button type="button" onClick={() => navigate('/shop')} className="btn btn-primary">
            Go to Shop
          </button>
        </div>
      </BuyerLayout>
    )
  }

  return (
    <BuyerLayout>
      <div className="panel-header">
        <div className="panel-header-text">
          <h1>Cart</h1>
          <p>{cart.length} item{cart.length !== 1 ? 's' : ''} in your cart</p>
        </div>
      </div>
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
                <p className="item-price">{formatPrice(item.price)}</p>
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
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="qty-input"
                    min="1"
                  />
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="item-subtotal"></div>
            </div>
          ))}
        </div>
        <div className="cart-summary">
          <div className="summary-row total">
            <span>Total:</span>
            <span>{formatPrice(getTotalPrice())}</span>
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
    </BuyerLayout>
  )
}
