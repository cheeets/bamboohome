import React, { useState } from 'react'
import { CheckCircle2, ShieldCheck, ArrowRight, Smartphone, KeyRound } from 'lucide-react'
import '../css/GcashDemoModal.css'

export function GcashDemoModal({ isOpen, onClose, amount, onPaymentSuccess }) {
  const [step, setStep] = useState(1) // 1: Phone, 2: OTP, 3: Success
  const [mobileNumber, setMobileNumber] = useState('09171234567')
  const [otp, setOtp] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const formattedAmount = Number(amount || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  })

  const handleNextPhone = (e) => {
    e.preventDefault()
    if (!/^(?:09\d{9}|\+639\d{9})$/.test(mobileNumber.trim())) {
      setError('Enter a valid 11-digit GCash mobile number (e.g. 09171234567).')
      return
    }
    setError('')
    setStep(2)
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (otp.length < 6) {
      setError('Enter the 6-digit authentication code sent via SMS.')
      return
    }
    setError('')
    setIsProcessing(true)

    setTimeout(() => {
      setIsProcessing(false)
      const simulatedRef = 'GCASH-' + Math.floor(1000000000 + Math.random() * 9000000000)
      setStep(3)
      setTimeout(() => {
        onPaymentSuccess(simulatedRef)
      }, 1800)
    }, 1500)
  }

  const handleAutofillOtp = () => {
    setOtp('123456')
    setError('')
  }

  return (
    <div className="gcash-modal-overlay">
      <div className="gcash-modal-card">
        {/* Top Header Banner */}
        <div className="gcash-header">
          <div className="gcash-brand">
            <span className="gcash-logo-text">GCash</span>
            <span className="gcash-badge">CAPSTONE DEMO GATEWAY</span>
          </div>
          <button type="button" className="gcash-close-btn" onClick={onClose} title="Cancel Payment">
            ✕
          </button>
        </div>

        {/* Merchant Info Box */}
        <div className="gcash-merchant-box">
          <div className="merchant-details">
            <span className="merchant-label">Merchant Store</span>
            <span className="merchant-name">Bamboo Home Marketplace</span>
          </div>
          <div className="amount-details">
            <span className="amount-label">Amount Due</span>
            <span className="amount-value">{formattedAmount}</span>
          </div>
        </div>

        {/* Step 1: Mobile Number Input */}
        {step === 1 && (
          <form onSubmit={handleNextPhone} className="gcash-body">
            <div className="gcash-step-indicator">
              <Smartphone size={20} className="step-icon" />
              <span>Step 1 of 2: Login with your GCash Number</span>
            </div>

            <div className="gcash-field">
              <label htmlFor="gcashMobile">Mobile Number</label>
              <div className="input-with-prefix">
                <span className="prefix">+63</span>
                <input
                  id="gcashMobile"
                  type="tel"
                  value={mobileNumber.replace(/^\+63|^0/, '')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setMobileNumber('0' + digits)
                  }}
                  placeholder="917 123 4567"
                  maxLength="10"
                  autoFocus
                  required
                />
              </div>
              <small className="field-hint">Enter your GCash registered mobile number for demo payment</small>
            </div>

            {error && <div className="gcash-error">{error}</div>}

            <div className="gcash-footer-actions">
              <button type="button" className="gcash-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="gcash-btn-primary">
                Next <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="gcash-body">
            <div className="gcash-step-indicator">
              <KeyRound size={20} className="step-icon" />
              <span>Step 2 of 2: Enter 6-Digit Authentication Code</span>
            </div>

            <p className="otp-sent-text">
              An SMS with a 6-digit code was sent to <strong>+63 {mobileNumber.slice(-10)}</strong>
            </p>

            <div className="gcash-field">
              <div className="otp-header-row">
                <label htmlFor="gcashOtp">Authentication Code (OTP)</label>
                <button type="button" className="autofill-link" onClick={handleAutofillOtp}>
                  Autofill demo OTP (123456)
                </button>
              </div>
              <input
                id="gcashOtp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="1 2 3 4 5 6"
                className="otp-input"
                maxLength="6"
                autoFocus
                required
              />
            </div>

            {error && <div className="gcash-error">{error}</div>}

            <div className="security-notice">
              <ShieldCheck size={16} />
              <span>Encrypted SSL Capstone Payment Demo • No real money deducted</span>
            </div>

            <div className="gcash-footer-actions">
              <button type="button" className="gcash-btn-secondary" onClick={() => setStep(1)} disabled={isProcessing}>
                Back
              </button>
              <button type="submit" className="gcash-btn-primary" disabled={isProcessing}>
                {isProcessing ? 'Processing Payment...' : `Pay ${formattedAmount}`}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Payment Success */}
        {step === 3 && (
          <div className="gcash-body gcash-success-body">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={56} className="success-icon" />
            </div>
            <h2>Payment Successful!</h2>
            <p className="success-subtext">Your GCash online payment has been authorized.</p>

            <div className="receipt-box">
              <div className="receipt-row">
                <span>Amount Paid:</span>
                <strong>{formattedAmount}</strong>
              </div>
              <div className="receipt-row">
                <span>Payment Channel:</span>
                <span>GCash Online Express</span>
              </div>
              <div className="receipt-row">
                <span>Status:</span>
                <span className="badge-paid">Paid Online</span>
              </div>
            </div>

            <p className="redirect-notice">Completing order and redirecting to purchases...</p>
          </div>
        )}
      </div>
    </div>
  )
}
