import { db } from '../services/firebase'
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore'

/**
 * Handles store rating submission
 * @param {string} sellerId - The seller's user ID
 * @param {string} userId - The current user's ID
 * @param {number} rating - The rating value (1-5)
 * @returns {Promise<boolean>} - Success status
 */
export const rateStore = async (sellerId, userId, rating) => {
  try {
    const sellerRef = doc(db, 'users', sellerId)

    // Check if user already rated
    const sellerSnap = await getDoc(sellerRef)
    if (sellerSnap.exists()) {
      const currentData = sellerSnap.data()
      const existingRating = currentData.storeRatings?.find(r => r.userId === userId)
      if (existingRating) {
        throw new Error('You have already rated this store.')
      }
    }

    await updateDoc(sellerRef, {
      storeRatings: arrayUnion({
        userId: userId,
        rating: rating,
        createdAt: new Date().toISOString()
      })
    })

    return true
  } catch (error) {
    console.error('Error rating store:', error)
    throw error
  }
}

/**
 * Calculates average rating from ratings array
 * @param {Array} ratings - Array of rating objects with rating property
 * @returns {string} - Formatted average rating
 */
export const calculateAverageRating = (ratings) => {
  if (!ratings || !Array.isArray(ratings) || ratings.length === 0) return '0.0'
  const sum = ratings.reduce((acc, curr) => acc + (curr.rating || 0), 0)
  return (sum / ratings.length).toFixed(1)
}

/**
 * Formats a price value with the currency symbol and 2 decimal places
 * @param {number} price - The price value to format
 * @returns {string} - Formatted price
 */
export const formatPrice = (price) => {
  return '₱' + (price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Gets stock status information for a product
 * @param {Object} product - Product object with stock and lowStockThreshold properties
 * @returns {Object} - Status object with label and class
 */
export const getStockStatus = (product) => {
  const stock = product.stock || 0
  const threshold = product.lowStockThreshold || 5
  if (stock <= 0) return { label: 'Out of Stock', class: 'out-of-stock' }
  if (stock <= threshold) return { label: 'Low Stock', class: 'low-stock' }
  return { label: 'In Stock', class: 'in-stock' }
}