import React, { useEffect, useState } from 'react'
import { db } from '../services/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { X, Package, Truck } from 'lucide-react'
import '../css/Notifications.css'

export function NotificationListener() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [previousOrders, setPreviousOrders] = useState({})

  useEffect(() => {
    if (!user) return

    const q = query(collection(db, 'orders'), where('userId', '==', user.uid))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data()
        const orderId = doc.id
        const currentStatus = (data.status || '').toLowerCase()
        
        // Check if we have a previous status for this order
        setPreviousOrders(prev => {
          const previousStatus = prev[orderId]
          
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
          
          // Return updated previous orders
          return {
            ...prev,
            [orderId]: currentStatus
          }
        })
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
            <span className="notification-order">Order #{notif.orderId.slice(0, 8).toUpperCase()}</span>
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
