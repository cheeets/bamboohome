import React, { useState, useEffect } from 'react'
import { 
  Store, 
  Star, 
  Clock, 
  ShoppingBag,
  TrendingUp,
  Search,
  Filter,
  Award
} from 'lucide-react'
import { db } from '../services/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { calculateAverageRating, formatPrice } from '../utils/rating'
import '../css/AdminSellerPerformance.css'

export default function AdminSellerPerformance() {
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('rating')
  const [filterRating, setFilterRating] = useState('all')

  useEffect(() => {
    fetchSellerPerformance()
  }, [])

  const normalizeOrderStatus = (status = '') => status.toString().trim().toLowerCase()

  const getOrderItems = (orderData = {}) => orderData?.products || orderData?.items || []

  const getOrderTotal = (orderData = {}) => {
    const items = getOrderItems(orderData)
    if (items.length > 0) {
      return items.reduce((sum, item) => {
        return sum + (Number(item.price || 0) * Number(item.quantity || 1))
      }, 0)
    }
    return Number(orderData.totalAmount || 0)
  }

  const fetchSellerPerformance = async () => {
    try {
      setLoading(true)
      
      // Fetch all sellers
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      )
      const usersSnapshot = await getDocs(usersQuery)
      const sellersList = []

      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        if (userData.role === 'seller') {
          sellersList.push({
            id: doc.id,
            ...userData,
          })
        }
      })

      // Fetch all orders to calculate seller metrics
      const ordersQuery = query(collection(db, 'orders'))
      const ordersSnapshot = await getDocs(ordersQuery)
      const ordersMap = {}

      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data()
        if (orderData.sellerId) {
          if (!ordersMap[orderData.sellerId]) {
            ordersMap[orderData.sellerId] = {
              totalOrders: 0,
              completedOrders: 0,
              totalRevenue: 0,
              pendingOrders: 0,
            }
          }
          ordersMap[orderData.sellerId].totalOrders += 1
          const normalizedStatus = normalizeOrderStatus(orderData.status)
          if (normalizedStatus === 'completed' || normalizedStatus === 'delivered') {
            ordersMap[orderData.sellerId].completedOrders += 1
            ordersMap[orderData.sellerId].totalRevenue += getOrderTotal(orderData)
          } else if (normalizedStatus === 'pending' || normalizedStatus === 'processing' || normalizedStatus === 'shipped') {
            ordersMap[orderData.sellerId].pendingOrders += 1
          }
        }
      })

      // Fetch all products to calculate catalog info
      const productsQuery = query(collection(db, 'products'))
      const productsSnapshot = await getDocs(productsQuery)
      const productsMap = {}

      productsSnapshot.forEach((doc) => {
        const productData = doc.data()
        if (productData.sellerId) {
          if (!productsMap[productData.sellerId]) {
            productsMap[productData.sellerId] = {
              totalProducts: 0,
              activeProducts: 0,
            }
          }
          productsMap[productData.sellerId].totalProducts += 1
          if (!productData.deleted) {
            productsMap[productData.sellerId].activeProducts += 1
          }
        }
      })

      // Combine all data
      const enrichedSellers = sellersList.map((seller) => {
        const metrics = ordersMap[seller.id] || {
          totalOrders: 0,
          completedOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
        }

        const products = productsMap[seller.id] || {
          totalProducts: 0,
          activeProducts: 0,
        }

        const avgResponseTime = seller.avgResponseTime || 0
        const avgRating = Number(calculateAverageRating(seller.storeRatings) || 0)
        const completionRate = metrics.totalOrders > 0 
          ? Math.round((metrics.completedOrders / metrics.totalOrders) * 100)
          : 0

        return {
          ...seller,
          ...metrics,
          ...products,
          avgResponseTime,
          avgRating,
          completionRate,
          performanceScore: calculatePerformanceScore(
            avgRating,
            completionRate,
            avgResponseTime
          ),
        }
      })

      setSellers(enrichedSellers)
      setError('')
    } catch (err) {
      console.error('Error fetching seller performance:', err)
      setError('Failed to load seller performance data')
    } finally {
      setLoading(false)
    }
  }

  const calculatePerformanceScore = (rating, completionRate, responseTime) => {
    // Score out of 100
    let score = 50 // Base score
    score += rating * 10 // Rating contributes up to 50
    score += completionRate * 0.3 // Completion rate contributes up to 30
    score -= Math.min(responseTime * 2, 20) // Response time deducts up to 20
    return Math.min(Math.max(score, 0), 100)
  }

  const filtered = sellers
    .filter((seller) => {
      const matchesSearch =
        seller.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.email?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRating =
        filterRating === 'all' ||
        (filterRating === '4plus' && seller.avgRating >= 4) ||
        (filterRating === '3plus' && seller.avgRating >= 3) ||
        (filterRating === 'below3' && seller.avgRating < 3)

      return matchesSearch && matchesRating
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.avgRating - a.avgRating
      if (sortBy === 'orders') return b.totalOrders - a.totalOrders
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue
      if (sortBy === 'score') return b.performanceScore - a.performanceScore
      return 0
    })

  const getPerformanceBadge = (score) => {
    if (score >= 85) return { text: 'Excellent', class: 'excellent' }
    if (score >= 70) return { text: 'Good', class: 'good' }
    if (score >= 50) return { text: 'Average', class: 'average' }
    return { text: 'Needs Improvement', class: 'poor' }
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#10b981'
    if (rating >= 4) return '#3b82f6'
    if (rating >= 3) return '#f59e0b'
    return '#ef4444'
  }

  if (loading) {
    return <div className="seller-performance-loading">Loading seller performance data...</div>
  }

  return (
    <div className="admin-seller-performance">
      <div className="dashboard-header">
        <div className="header-title">
          <Award size={28} />
          <div>
            <h1>Seller Performance Analytics</h1>
            <p>Monitor seller ratings, completion rates, and business metrics</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="mini-stat">
            <span className="label">Active Sellers</span>
            <span className="value">{sellers.length}</span>
          </div>
          <div className="mini-stat">
            <span className="label">Avg Platform Rating</span>
            <span className="value">
              {sellers.length > 0
                ? (sellers.reduce((acc, s) => acc + s.avgRating, 0) / sellers.length).toFixed(2)
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filters-section">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by store name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="score">Performance Score</option>
              <option value="rating">Average Rating</option>
              <option value="orders">Total Orders</option>
              <option value="revenue">Total Revenue</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Rating Filter:</label>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
              <option value="all">All Ratings</option>
              <option value="4plus">4+ Stars</option>
              <option value="3plus">3+ Stars</option>
              <option value="below3">Below 3 Stars</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Store size={48} />
          <p>No sellers found matching your criteria</p>
        </div>
      ) : (
        <div className="sellers-table">
          <div className="table-header">
            <div className="col-store">Store Name</div>
            <div className="col-rating">Rating</div>
            <div className="col-score">Performance</div>
            <div className="col-orders">Orders</div>
            <div className="col-completion">Completion</div>
            <div className="col-products">Products</div>
            <div className="col-revenue">Revenue</div>
          </div>

          {filtered.map((seller) => {
            const badge = getPerformanceBadge(seller.performanceScore)
            return (
              <div key={seller.id} className="table-row">
                <div className="col-store">
                  <div className="store-info">
                    <Store size={16} style={{ color: '#666' }} />
                    <div>
                      <p className="store-name">{seller.storeName || 'Unnamed Store'}</p>
                      <p className="store-email">{seller.email}</p>
                    </div>
                  </div>
                </div>

                <div className="col-rating">
                  <div className="rating-display">
                    <Star size={16} fill={getRatingColor(seller.avgRating)} color={getRatingColor(seller.avgRating)} />
                    <span className="rating-value">{seller.avgRating.toFixed(2)}</span>
                  </div>
                </div>

                <div className="col-score">
                  <div className={`performance-badge ${badge.class}`}>
                    {badge.text}
                  </div>
                  <span className="score-number">{seller.performanceScore.toFixed(1)}</span>
                </div>

                <div className="col-orders">
                  <ShoppingBag size={16} style={{ color: '#666' }} />
                  <span>{seller.totalOrders}</span>
                </div>

                <div className="col-completion">
                  <div className="completion-bar">
                    <div
                      className="completion-fill"
                      style={{
                        width: `${seller.completionRate}%`,
                        backgroundColor: seller.completionRate >= 80 ? '#10b981' : seller.completionRate >= 60 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="completion-text">{seller.completionRate}%</span>
                </div>

                <div className="col-products">
                  <span className="active-products">{seller.activeProducts}</span>
                  <span className="total-products">/ {seller.totalProducts}</span>
                </div>

                <div className="col-revenue">
                  <TrendingUp size={16} style={{ color: '#10b981' }} />
                  <span className="revenue-value">{formatPrice(seller.totalRevenue)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="performance-legend">
        <h3>Performance Score Legend</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-badge excellent">Excellent</div>
            <span>85-100: Exceptional seller performance</span>
          </div>
          <div className="legend-item">
            <div className="legend-badge good">Good</div>
            <span>70-84: Strong performance</span>
          </div>
          <div className="legend-item">
            <div className="legend-badge average">Average</div>
            <span>50-69: Acceptable performance</span>
          </div>
          <div className="legend-item">
            <div className="legend-badge poor">Needs Improvement</div>
            <span>Below 50: Performance review needed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
