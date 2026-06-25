import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getFriendlyErrorMessage } from '../utils/errorMessages'
import { useNavigate } from 'react-router-dom'
import { Toast } from './Toast'
import '../css/LoginModal.css'

export function LoginModal({ isOpen, onClose, onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)
      
      if (result.role === 'user') {
        setShowSuccessToast(true)
        // Give time for the toast to be seen before redirecting
        setTimeout(() => {
          setEmail('')
          setPassword('')
          onClose()
          navigate('/shop')
        }, 1500)
      } else {
        setEmail('')
        setPassword('')
        onClose()
        
        // Navigate based on user role
        if (result.role === 'seller') {
          navigate('/seller/dashboard')
        } else if (result.role === 'admin') {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay2" onClick={handleClose}>
      <div className="login-modal2" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content2">
          <button className="modal-close" onClick={handleClose}>&times;</button>
          
          <h2>Login</h2>
          
          {showSuccessToast && (
            <Toast 
              message="Welcome back! Successfully logged in as Buyer." 
              type="success" 
              onClose={() => setShowSuccessToast(false)} 
            />
          )}

          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                disabled={showSuccessToast}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                disabled={showSuccessToast}
              />
            </div>
            <button type="submit" disabled={loading || showSuccessToast} className="btn btn-primary btn-full">
              {loading ? (showSuccessToast ? 'Redirecting...' : 'Logging in...') : 'Login'}
            </button>
          </form>
          <p className="modal-footer">
            Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); handleClose(); onSwitchToSignup?.(); }}>Sign up here</a>
          </p>
        </div>
      </div>
    </div>
  )
}
