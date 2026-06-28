import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { Header } from './components/Header'
import { ProtectedRoute } from './components/ProtectedRoute'
import { NotificationListener } from './components/NotificationListener'
import { useAuth } from './context/AuthContext'
import { Home } from './pages/Home'
import { ShopPage } from './pages/ShopPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { AdminOrdersDashboard } from './pages/Dashboard'
import { Orders } from './pages/Orders'
import { Chat } from './pages/Chat'
import { Profile } from './pages/Profile'
import { SellerDashboard } from './pages/SellerDashboard'
import './css/App.css'

function AppContent() {
  const location = useLocation()
  const { user, userRole } = useAuth()
  const isHomePage = location.pathname === '/' || location.pathname === '/home'
  const showHeader = !isHomePage

  if (isHomePage && user) {
    if (userRole === 'admin') return <Navigate to="/dashboard" replace />
    if (userRole === 'seller') return <Navigate to="/seller/dashboard" replace />
    return <Navigate to="/shop" replace />
  }

  return (
    <>
      {showHeader && <Header />}
      {user && <NotificationListener />}
      <main className={isHomePage ? 'main-content landing' : 'main-content'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<ShopPage />} />
          
          <Route path="/cart" element={<ProtectedRoute requiredRole="user"><CartPage /></ProtectedRoute>} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute requiredRole="user">
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute requiredRole="user">
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminOrdersDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/dashboard"
            element={
              <ProtectedRoute requiredRole="seller">
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
