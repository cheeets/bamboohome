import React, { useEffect, useState } from 'react'
import { db } from '../services/firebase'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { X, Package, Truck, AlertTriangle } from 'lucide-react'
import '../css/Notifications.css'

export function NotificationListener() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])

  // Helper functions for localStorage
  const getStoredData = (key) => {
    if (!user) return {}
    try {
      const stored = localStorage.getItem(`notif_${user.uid}_${key}`)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  const setStoredData = (key, data) => {
    if (!user) return
    try {
      localStorage.setItem(`notif_${user.uid}_${key}`, JSON.stringify(data))
    } catch {
      // Ignore storage errors
    }
  }

  const getStoredNotificationIds = () => {
    if (!user) return new Set()
    try {
      const stored = localStorage.getItem(`notif_${user.uid}_processedIds`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  }

  const addStoredNotificationId = (id) => {
    if (!user) return
    try {
      const ids = getStoredNotificationIds()
      ids.add(id)
      localStorage.setItem(`notif_${user.uid}_processedIds`, JSON.stringify([...ids]))
    } catch {
      // Ignore storage errors
    }
  }

  // Listen for order status changes
  useEffect(() => {
    if (!user) return

    let previousOrders = getStoredData('orderStatuses')

    const q = query(collection(db, 'orders'), where('userId', '==', user.uid))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data()
        const orderId = doc.id
        const currentStatus = (data.status || '').toLowerCase()
        
        // Check if we have a previous status for this order
        const previousStatus = previousOrders[orderId]
        
        // Only show notification if status actually changed
        if (previousStatus && previousStatus !== currentStatus) {
          let notification = null
          
          if (currentStatus === 'processing') {
            notification = {
              id: `${orderId}_${Date.now()}`,
              orderId,
              type: 'accepted',
              icon: <Package size={24} />,
              title: 'Order Accepted!',
              message: 'Your order has been accepted by the seller and is being prepared.',
              color: '#22c55e',
              timestamp: new Date()
            }
          } else if (currentStatus === 'delivered') {
            const deliveryMessage = data.deliveryMessage || 'Your order will be delivered today!'
            notification = {
              id: `${orderId}_${Date.now()}`,
              orderId,
              type: 'delivery',
              icon: <Truck size={24} />,
              title: 'Out for Delivery!',
              message: deliveryMessage,
              color: '#3b82f6',
              timestamp: new Date()
            }
          }
          
          if (notification) {
            setNotifications(prevNotifs => [notification, ...prevNotifs])
            
            // Auto-remove after 10 seconds
            setTimeout(() => {
              setNotifications(prevNotifs => prevNotifs.filter(n => n.id !== notification.id))
            }, 10000)
          }
        }
        
        // Update previous orders
        previousOrders = {
          ...previousOrders,
          [orderId]: currentStatus
        }
        setStoredData('orderStatuses', previousOrders)
      })
    })

    return () => unsubscribe()
  }, [user])

  // Listen for notifications from 'notifications' collection (including seller warnings)
  useEffect(() => {
    if (!user) return

    const processedNotificationIds = getStoredNotificationIds()

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data()
          const notificationId = change.doc.id
          
          // Only process if we haven't already processed this notification
          if (!processedNotificationIds.has(notificationId)) {
            addStoredNotificationId(notificationId)
            
            let notification = null
            
            if (data.type === 'seller_warning') {
              notification = {
                id: `${notificationId}_${Date.now()}`,
                type: 'warning',
                icon: <AlertTriangle size={24} />,
                title: 'Warning from Admin',
                message: data.message,
                color: '#f59e0b',
                timestamp: new Date()
              }
            } else if (data.type === 'order_accepted') {
              notification = {
                id: `${notificationId}_${Date.now()}`,
                orderId: data.relatedId,
                type: 'accepted',
                icon: <Package size={24} />,
                title: 'Order Accepted!',
                message: data.message,
                color: '#22c55e',
                timestamp: new Date()
              }
            } else if (data.type === 'out_for_delivery') {
              notification = {
                id: `${notificationId}_${Date.now()}`,
                orderId: data.relatedId,
                type: 'delivery',
                icon: <Truck size={24} />,
                title: 'Out for Delivery!',
                message: data.message,
                color: '#3b82f6',
                timestamp: new Date()
              }
            }
            
            if (notification) {
              setNotifications(prevNotifs => [notification, ...prevNotifs])
              
              // Auto-remove after 10 seconds
              setTimeout(() => {
                setNotifications(prevNotifs => prevNotifs.filter(n => n.id !== notification.id))
              }, 10000)
            }
          }
        }
      })
    })

    return () => unsubscribe()
  }, [user])

  const handleClose = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (notifications.length === 0) return null

  return (
    <div className="notifications-container">
      {notifications.map((notif) => (
        <div 
          key={notif.id} 
          className="notification-card"
          style={{ borderLeftColor: notif.color }}
        >
          <div className="notification-icon" style={{ color: notif.color }}>
            {notif.icon}
          </div>
          <div className="notification-content">
            <h4 className="notification-title">{notif.title}</h4>
            <p className="notification-message">{notif.message}</p>
            {notif.orderId && (
              <span className="notification-order">Order #{notif.orderId.slice(0, 8).toUpperCase()}</span>
            )}
          </div>
          <button 
            className="notification-close"
            onClick={() => handleClose(notif.id)}
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  )
}
