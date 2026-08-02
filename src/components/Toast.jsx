import React, { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import '../css/Notifications.css'

export function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onClose) onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const getIcon = () => {
    if (type === 'success') return <CheckCircle2 size={20} />
    if (type === 'error') return <AlertTriangle size={20} />
    if (type === 'info') return <Info size={20} />
    return <Info size={20} />
  }

  const getColor = () => {
    if (type === 'success') return '#22c55e'
    if (type === 'error') return '#ef4444'
    if (type === 'info') return '#3b82f6'
    return '#6b7280'
  }

  const titleMap = {
    success: 'Success',
    error: 'Error',
    info: 'Info',
  }

  return (
    <div className="notifications-container" style={{ top: '80px', right: '20px' }}>
      <div className="notification-card" style={{ borderLeftColor: getColor() }}>
        <div className="notification-icon" style={{ color: getColor(), background: 'rgba(0,0,0,0.04)' }}>
          {getIcon()}
        </div>
        <div className="notification-content">
          <h4 className="notification-title">{titleMap[type] || 'Notice'}</h4>
          <p className="notification-message">{message}</p>
        </div>
        <button className="notification-close" onClick={() => { setIsVisible(false); if (onClose) onClose() }}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
