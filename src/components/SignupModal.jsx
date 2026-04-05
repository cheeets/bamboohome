import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getFriendlyErrorMessage } from '../utils/errorMessages'
import { useNavigate } from 'react-router-dom'
import '../css/LoginModal.css'

export function SignupModal({ isOpen, onClose, onSwitchToLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user') // 'user' | 'seller'
  const [storeName, setStoreName] = useState('')
  const [storePhotoUrl, setStorePhotoUrl] = useState('')
  const [storePhotoFile, setStorePhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
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

  const handlePhotoUpload = async (file) => {
    if (!file) return

    try {
      // Convert file to base64 and compress
      const reader = new FileReader()
      reader.onloadend = () => {
        let imageData = reader.result
        
        // Compress image by converting to lower quality
        const img = new Image()
        img.src = imageData
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Reduce size if too large
          const maxDimension = 800
          if (width > height) {
            if (width > maxDimension) {
              height = Math.floor((height * maxDimension) / width)
              width = maxDimension
            }
          } else {
            if (height > maxDimension) {
              width = Math.floor((width * maxDimension) / height)
              height = maxDimension
            }
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to compressed base64 (JPEG quality 0.7)
          const compressedData = canvas.toDataURL('image/jpeg', 0.7)
          console.log('Original size:', imageData.length, 'bytes → Compressed size:', compressedData.length, 'bytes')
          
          setPhotoPreview(compressedData)
          setStorePhotoUrl(compressedData)
        }
      }
      reader.readAsDataURL(file)
      setStorePhotoFile(file)
    } catch (err) {
      console.error('Error uploading photo:', err)
      setError('Failed to upload photo')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(
        email,
        password,
        name,
        role,
        role === 'seller' ? storeName : '',
        role === 'seller' ? storePhotoUrl : ''
      )
      setName('')
      setEmail('')
      setPassword('')
      setStoreName('')
      setStorePhotoUrl('')
      setPhotoPreview(null)
      onClose()
      navigate(role === 'seller' ? '/seller/dashboard' : '/shop')
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setEmail('')
    setPassword('')
    setStoreName('')
    setStorePhotoUrl('')
    setPhotoPreview(null)
    setRole('user')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay2" onClick={handleClose}></div>
      <div className="login-modal2">
        <div className="modal-content2">
          <button className="modal-close" onClick={handleClose}>&times;</button>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Register As</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="role-select-input"
              >
                <option value="user">User (Buyer)</option>
                <option value="seller">Seller</option>
              </select>
            </div>
            {role === 'seller' && (
              <>
                <div className="form-group">
                  <label htmlFor="storeName">Store Name *</label>
                  <input
                    type="text"
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                    placeholder="Enter your store name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="storePhoto">Store Photo / Logo *</label>
                  {photoPreview && (
                    <div className="photo-preview-container">
                      <img src={photoPreview} alt="Store preview" className="store-photo-preview" />
                      <button
                        type="button"
                        className="btn-remove-photo"
                        onClick={() => {
                          setPhotoPreview(null)
                          setStorePhotoUrl('')
                          setStorePhotoFile(null)
                        }}
                      >
                        Remove Photo
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    id="storePhoto"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e.target.files[0])}
                    required={!storePhotoUrl}
                    className="file-input"
                    placeholder="Upload your store photo"
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
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
                placeholder="Enter your password (min 6 characters)"
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-full">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
          <p className="modal-footer">
            Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); handleClose(); onSwitchToLogin(); }}>Login here</a>
          </p>
        </div>
      </div>
    </>
  )
}
