import { db } from './firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

/**
 * Create a notification in Firestore
 * @param {string} userId - The user who will receive the notification
 * @param {string} message - The notification message
 * @param {string} orderId - The related order ID
 * @param {string} type - Notification type ('order_accepted', 'out_for_delivery', etc.)
 */
export async function createNotification(userId, message, orderId, type = 'order_update') {
  console.log('🔔 createNotification called with:', { userId, message, orderId, type })
  
  if (!userId) {
    console.error('❌ Cannot create notification: userId is missing')
    return
  }
  
  try {
    const notificationData = {
      userId,
      message,
      orderId,
      type,
      isRead: false,
      createdAt: serverTimestamp()
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
