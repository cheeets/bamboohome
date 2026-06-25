import React from 'react'
import { useAuth } from '../context/AuthContext'
import BuyerSidebar from './BuyerSidebar'
import '../css/BuyerLayout.css'

export function BuyerLayout({ children, guest = false }) {
  const { user, userRole } = useAuth()
  const showSidebar = !guest && user && userRole === 'user'

  return (
    <div className={`buyer-marketplace ${!showSidebar ? 'buyer-marketplace--guest' : ''}`}>
      <div className="buyer-marketplace-inner">
        {showSidebar && <BuyerSidebar />}
        <div className="buyer-main-panel">{children}</div>
      </div>
    </div>
  )
}
