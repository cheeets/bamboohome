import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoginModal } from '../components/LoginModal'
import { SignupModal } from '../components/SignupModal'
import '../css/Home.css'

export function Home() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)

  useEffect(() => {
    if (user && userRole === 'seller') {
      navigate('/seller/dashboard', { replace: true })
    } else if (user && userRole === 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userRole, navigate])

  const handleGetStarted = () => {
    if (user) {
      navigate('/shop')
    } else {
      setShowLoginModal(true)
    }
  }

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-content-wrapper">
          <div className="hero-text">
            <h1 className="hero-title">
              Rooted in Strength,<br />
              Designed for <span className="hero-highlight">Growth</span>
            </h1>
            <p className="hero-description">
              Discover eco-friendly bamboo furniture crafted by local artisans.
              Transform your space with sustainable elegance.
            </p>
            <div className="hero-cta-group">
              <button className="hero-btn primary" onClick={handleGetStarted}>
                Shop Collection
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&auto=format&fit=crop&q=80"
              alt="Handcrafted bamboo furniture in a modern living space"
              className="hero-visual-img"
            />
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="section-header">
          <div className="section-badge">Why Choose Us</div>
          <h2>Built for Sustainability</h2>
          <p>Quality craftsmanship meets environmental responsibility</p>
        </div>
        <div className="cta-grid">
          <div className="cta-card">
            <div className="cta-icon-wrapper">
              <div className="cta-icon">🌱</div>
            </div>
            <h3>Eco-Friendly</h3>
            <p>Renewable bamboo materials that reduce environmental impact and promote sustainable living.</p>
          </div>
          <div className="cta-card">
            <div className="cta-icon-wrapper">
              <div className="cta-icon">🛠️</div>
            </div>
            <h3>Local Craftsmanship</h3>
            <p>Handcrafted by skilled Filipino artisans with decades of traditional expertise.</p>
          </div>
          <div className="cta-card">
            <div className="cta-icon-wrapper">
              <div className="cta-icon">💪</div>
            </div>
            <h3>Durable Quality</h3>
            <p>Stronger than many hardwoods and built to last for generations to come.</p>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="section-header">
          <div className="section-badge">Process</div>
          <h2>How It Works</h2>
          <p>From sustainable sourcing to your doorstep</p>
        </div>
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-image">
              <img
                src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80"
                alt="Sustainable sourcing"
              />
              <span className="feature-badge">1</span>
            </div>
            <div className="feature-content">
              <h3>Sustainable Sourcing</h3>
              <p>Responsibly harvested bamboo from trusted local farms committed to environmental stewardship.</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-image">
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80"
                alt="Craftsmanship"
              />
              <span className="feature-badge">2</span>
            </div>
            <div className="feature-content">
              <h3>Expert Crafting</h3>
              <p>Traditional and modern techniques combined to create furniture that's both beautiful and functional.</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-image">
              <img
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80"
                alt="Delivery"
              />
              <span className="feature-badge">3</span>
            </div>
            <div className="feature-content">
              <h3>Delivered to You</h3>
              <p>Eco-friendly furniture delivered straight to your home with care and attention to detail.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-content">
          <h2>Ready to Transform Your Space?</h2>
          <p>Join thousands of satisfied customers who chose sustainable living</p>
          <button className="final-cta-btn" onClick={handleGetStarted}>
            {user ? 'Start Shopping' : 'Get Started Today'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </section>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => {
          setShowLoginModal(false)
          setShowSignupModal(true)
        }}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => {
          setShowSignupModal(false)
          setShowLoginModal(true)
        }}
      />
    </div>
  )
}
