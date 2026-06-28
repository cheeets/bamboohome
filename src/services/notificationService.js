import { db } from './firebase'
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore'

/**
 * Create a notification in Firestore
 * @param {string} userId - The user who will receive the notification
 * @param {string} message - The notification message
 * @param {string} [relatedId] - The related ID (orderId or reportId)
 * @param {string} type - Notification type ('order_accepted', 'out_for_delivery', etc.)
 */
export async function createNotification(userId, message, relatedId = null, type = 'order_update') {
  console.log('🔔 createNotification called with:', { userId, message, relatedId, type })
  
  if (!userId) {
    console.error('❌ Cannot create notification: userId is missing')
    return
  }
  
  try {
    const notificationData = {
      userId,
      message,
      type,
      isRead: false,
      createdAt: serverTimestamp()
    }
    
    // Add relatedId if provided
    if (relatedId) {
      notificationData.relatedId = relatedId
    }
    
    console.log('📝 Creating notification document:', notificationData)
    const docRef = await addDoc(collection(db, 'notifications'), notificationData)
    console.log('✅ Notification created successfully! Doc ID:', docRef.id)
  } catch (error) {
    console.error('❌ Error creating notification:', error)
    console.error('Error details:', error.message)
  }
}

/**
 * Send a warning to a seller from admin
 * @param {string} sellerId - Seller's user ID
 * @param {string} warningMessage - The warning message from admin
 * @param {string} reportId - The related report ID
 * @param {string} reason - The reason for the warning
 */
export async function sendSellerWarning(sellerId, warningMessage, reportId, reason = '') {
  console.log('⚠️ sendSellerWarning called with:', { sellerId, warningMessage, reportId, reason })
  
  if (!sellerId) {
    console.error('❌ Cannot send warning: sellerId is missing')
    return false
  }
  
  try {
    // Create warning notification
    await createNotification(
      sellerId,
      warningMessage,
      reportId,
      'seller_warning'
    )
    
    // Also add warning to seller's document for record keeping
    const sellerRef = doc(db, 'users', sellerId)
    // First check if the seller document exists, if not, maybe handle that, but at least try to update
    try {
      await updateDoc(sellerRef, {
        warnings: arrayUnion({
          id: reportId,
          message: warningMessage,
          reason: reason,
          issuedAt: serverTimestamp(),
          issuedBy: 'admin'
        })
      })
    } catch (updateError) {
      console.error('⚠️ Could not update seller document with warning:', updateError)
      // If updating fails (e.g., warnings field doesn't exist), we still consider the warning sent because the notification was created
    }
    
    console.log('✅ Warning sent to seller successfully!')
    return true
  } catch (error) {
    console.error('❌ Error sending warning to seller:', error)
    return false
  }
}

/**
 * Trigger notification when order status changes
 * @param {string} userId - Buyer's user ID
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New order status
 * @param {string} deliveryMessage - Optional custom delivery message
 */
export async function notifyOrderStatusChange(userId, orderId, newStatus, deliveryMessage = '') {
  console.log('🚀 notifyOrderStatusChange called:', { userId, orderId, newStatus, deliveryMessage })
  
  const status = newStatus.toLowerCase()
  console.log('📊 Normalized status:', status)
  
  if (status === 'processing') {
    console.log('✉️ Triggering order_accepted notification')
    await createNotification(
      userId,
      'Your order has been accepted by the seller and is being prepared.',
      orderId,
      'order_accepted'
    )
  } else if (status === 'delivered') {
    console.log('✉️ Triggering out_for_delivery notification')
    const message = deliveryMessage || 'Your order is now out for delivery!'
    await createNotification(
      userId,
      message,
      orderId,
      'out_for_delivery'
    )
  } else {
    console.log('⚠️ Status not matched for notification:', status)
  }
}
