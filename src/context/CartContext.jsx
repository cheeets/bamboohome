import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from './AuthContext'

const CartContext = createContext()

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState([])

  // Mirror of `cart` so mutators can compute the next value synchronously and
  // persist exactly the same array that is rendered.
  const cartRef = useRef([])
  // The uid the currently loaded cart belongs to (used to detect account changes).
  const activeUidRef = useRef(null)

  const applyCart = useCallback((next) => {
    cartRef.current = next
    setCart(next)
  }, [])

  const persistCart = useCallback(async (uid, items) => {
    if (!uid) return
    try {
      await setDoc(doc(db, 'carts', uid), { userId: uid, items })
    } catch (error) {
      console.error('Error saving cart to Firestore:', error)
    }
  }, [])

  // Remove the legacy global cart key. It was shared by every account on this
  // browser, which is what leaked one account's cart into another.
  useEffect(() => {
    try {
      localStorage.removeItem('greennest_cart')
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Load the signed-in user's cart, and reset the cart state whenever the user
  // signs out or switches accounts.
  useEffect(() => {
    let cancelled = false
    const uid = user?.uid || null

    if (!uid) {
      // Signed out: never keep another account's items around.
      activeUidRef.current = null
      applyCart([])
      return () => {
        cancelled = true
      }
    }

    if (activeUidRef.current !== uid) {
      // User changed: clear first so the previous account's cart is never shown.
      activeUidRef.current = uid
      applyCart([])
    }

    const loadCart = async () => {
      try {
        const snap = await getDoc(doc(db, 'carts', uid))
        if (cancelled || activeUidRef.current !== uid) return
        const items = snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : []
        applyCart(items)
      } catch (error) {
        console.error('Error loading cart from Firestore:', error)
        if (!cancelled && activeUidRef.current === uid) applyCart([])
      }
    }

    loadCart()
    return () => {
      cancelled = true
    }
  }, [user?.uid, applyCart])

  // Update state and persist it to this user's cart document.
  const commit = (next) => {
    applyCart(next)
    persistCart(user?.uid, next)
  }

  const addToCart = (product, quantity = 1) => {
    const prevCart = cartRef.current
    const existingItem = prevCart.find((item) => item.id === product.id)
    const next = existingItem
      ? prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        )
      : [...prevCart, { ...product, quantity }]
    commit(next)
  }

  const removeFromCart = (productId) => {
    commit(cartRef.current.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    commit(cartRef.current.map((item) => (item.id === productId ? { ...item, quantity } : item)))
  }

  const updateItemPrice = (productId, newPrice) => {
    commit(cartRef.current.map((item) => (item.id === productId ? { ...item, price: newPrice } : item)))
  }

  // Clears the cart for the current user and deletes their carts/{uid} document.
  const clearCart = () => {
    applyCart([])
    const uid = user?.uid
    if (!uid) return
    deleteDoc(doc(db, 'carts', uid)).catch((error) => {
      console.error('Error clearing cart document:', error)
    })
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.length
  }

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateItemPrice,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getCartItemCount,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
