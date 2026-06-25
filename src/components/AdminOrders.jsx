import React, { useState } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import { TrendingUp, Package, Users, Store, BarChart3, PieChart, Activity } from 'lucide-react'
import { formatPrice } from '../utils/rating'
import '../css/AdminOrdersDashboard.css'

export default function AdminOrders({
  loading,
  error,
  filteredOrders,
  stats,
  filterStatus,
  setFilterStatus,
  updateOrderStatus,
  formatDate,
  activeView,
  setActiveView,
  analyticsTimeframe,
  setAnalyticsTimeframe,
  analyticsData,
  productMap,
  totalProducts,
  barChartData,
  barChartOptions,
  pieChartData,
  pieChartOptions,
  platformStats,
  activeSubView,
  setActiveSubView,
}) {
  const sortedProductPerformance = React.useMemo(() => {
    return Object.entries(productMap)
      .sort(([, a], [, b]) => b - a)
  }, [productMap])

  return (
    <>
      <div className="analytics-section">
        <div className="analytics-header">
          <h2>Platform Analytics</h2>
          <div className="analytics-tabs">
            <button 
              className={`analytics-tab-btn ${activeSubView === 'sales-analytics' ? 'active' : ''}`}
              onClick={() => setActiveSubView('sales-analytics')}
            >
              <BarChart3 size={16} /> Sales & Orders
            </button>
            <button 
              className={`analytics-tab-btn ${activeSubView === 'product-performance' ? 'active' : ''}`}
              onClick={() => setActiveSubView('product-performance')}
            >
              <PieChart size={16} /> Product Performance
            </button>
            <button 
              className={`analytics-tab-btn ${activeSubView === 'platform-stats' ? 'active' : ''}`}
              onClick={() => setActiveSubView('platform-stats')}
            >
              <Activity size={16} /> Platform Overview
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Platform Overview / Platform Stats View */}
        {(activeSubView === 'platform-stats' || activeSubView === 'sales-analytics') && platformStats && (
            <div className="platform-stats-grid">
              <div className="platform-stat-card stat-card-revenue">
                <div className="stat-icon-wrapper">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Sales Revenue</span>
                  <span className="stat-value">{formatPrice(platformStats.totalSales)}</span>
                </div>
              </div>
              <div className="platform-stat-card stat-card-users">
                <div className="stat-icon-wrapper">
                  <Users size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Active Users</span>
                  <span className="stat-value">{platformStats.users ?? 0}</span>
                </div>
              </div>
              <div className="platform-stat-card stat-card-sellers">
                <div className="stat-icon-wrapper">
                  <Store size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Registered Sellers</span>
                  <span className="stat-value">{platformStats.sellers ?? 0}</span>
                </div>
              </div>
              <div className="platform-stat-card stat-card-orders">
                <div className="stat-icon-wrapper">
                  <Package size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Orders Placed</span>
                  <span className="stat-value">{filteredOrders.length}</span>
                </div>
              </div>
            </div>
          )}

        {/* Sales & Orders View */}
        {activeSubView === 'sales-analytics' && (
          <div className="sales-analytics-content">
            <div className="analytics-controls">
              <span className="filter-label">Timeframe:</span>
              <div className="time-filter-group">
                <button
                  className={`time-filter-btn ${analyticsTimeframe === 'day' ? 'active' : ''}`}
                  onClick={() => setAnalyticsTimeframe('day')}
                >
                  Day
                </button>
                <button
                  className={`time-filter-btn ${analyticsTimeframe === 'week' ? 'active' : ''}`}
                  onClick={() => setAnalyticsTimeframe('week')}
                >
                  Week
                </button>
                <button
                  className={`time-filter-btn ${analyticsTimeframe === 'month' ? 'active' : ''}`}
                  onClick={() => setAnalyticsTimeframe('month')}
                >
                  Month
                </button>
                <button
                  className={`time-filter-btn ${analyticsTimeframe === 'year' ? 'active' : ''}`}
                  onClick={() => setAnalyticsTimeframe('year')}
                >
                  Year
                </button>
              </div>
            </div>

            <div className="charts-container single-chart">
              <div className="chart-wrapper main-chart order-trends-chart-wrapper">
                <h3>Order Trends</h3>
                {analyticsData.length === 0 ? (
                  <div className="chart-empty">
                    <p>No data available for this period</p>
                  </div>
                ) : (
                  <div className="order-trends-chart">
                    <Line data={barChartData} options={barChartOptions} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Product Performance View */}
        {activeSubView === 'product-performance' && (
          <div className="product-performance-content">
            <div className="charts-container">
              <div className="chart-wrapper compact-chart">
                <h3>Product Distribution</h3>
                <div className="chart-inner">
                  <Doughnut data={pieChartData} options={{
                    ...pieChartOptions,
                    maintainAspectRatio: true,
                    aspectRatio: 1.5,
                    plugins: {
                      ...pieChartOptions.plugins,
                      legend: {
                        position: 'bottom',
                        labels: {
                          font: { size: 11 },
                          padding: 12,
                          boxWidth: 12
                        }
                      }
                    }
                  }} />
                </div>
              </div>
            </div>

            {Object.keys(productMap).length > 0 && (
              <div className="product-stats-summary">
                <h3>Product Performance Rankings</h3>
                <div className="product-stats-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Product Name</th>
                        <th>Quantity Sold</th>
                        <th>Market Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProductPerformance.map(([productName, quantity], index) => (
                        <tr key={productName}>
                          <td className="rank-cell">#{index + 1}</td>
                          <td className="product-name">{productName}</td>
                          <td className="product-quantity">{quantity}</td>
                          <td className="product-percentage">
                            <div className="share-bar-container">
                              <div 
                                className="share-bar" 
                                style={{ width: `${((quantity / totalProducts) * 100).toFixed(1)}%` }}
                              ></div>
                              <span>{((quantity / totalProducts) * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
