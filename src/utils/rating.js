import { db } from '../services/firebase'
import { doc, runTransaction } from 'firebase/firestore'

/**
 * Handles store rating submission (buyers can re-rate unlimited times).
 * @param {string} sellerId - The seller's user ID
 * @param {string} userId - The current user's ID
 * @param {number} rating - The rating value (1-5)
 * @returns {Promise<{hadPreviousRating: boolean}>} - Result with re-rate flag
 */
export const rateStore = async (sellerId, userId, rating) => {
  try {
    // Validate rating is between 1 and 5
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5.')
    }

    // Prevent rating own store
    if (sellerId === userId) {
      throw new Error('You cannot rate your own store.')
    }

    const sellerRef = doc(db, 'users', sellerId)

    return await runTransaction(db, async (transaction) => {
      const sellerSnap = await transaction.get(sellerRef)
      const currentData = sellerSnap.exists() ? sellerSnap.data() : {}
      const currentRatings = Array.isArray(currentData.storeRatings) ? currentData.storeRatings : []
      const hadPreviousRating = currentRatings.some(r => r.userId === userId)

      // Replace the buyer's previous rating (if any) with the new one.
      const storeRatings = [
        ...currentRatings.filter(r => r.userId !== userId),
        { userId, rating, createdAt: new Date().toISOString() }
      ]

      transaction.update(sellerRef, { storeRatings })

      return { hadPreviousRating }
    })
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