import React, { useState } from 'react'
import { generateSalesInsights } from '../services/aiService'

export default function AdminSalesInsights({ allOrders = [], allProducts = [] }) {
  const [loading, setLoading] = useState(false)
  const [insightText, setInsightText] = useState('')
  const [error, setError] = useState('')

  const buildProductPayload = () => {
    // Build sold counts keyed by product ID and product name
    const soldMap = {}
    allOrders.forEach((order) => {
      ;(order.products || order.items || []).forEach((item) => {
        const idKey = item.productId || item.id
        const nameKey = item.name
        const qty = Number(item.quantity || item.qty || item.amount || 1)
        if (idKey) soldMap[idKey] = (soldMap[idKey] || 0) + qty
        if (nameKey) soldMap[nameKey] = (soldMap[nameKey] || 0) + qty
      })
    })

    // Map through non-deleted products and attach aggregated sold counts
    return allProducts
      .filter((p) => !p.deleted)
      .map((p) => {
        const soldFromOrders = (soldMap[p.id] || 0) + (p.name ? (soldMap[p.name] || 0) : 0)
        const soldFromDoc = Number(p.sold || p.soldCount || p.salesCount || 0)
        return {
          id: p.id,
          name: p.name || 'Unnamed Product',
          sold: Math.max(soldFromOrders, soldFromDoc),
          stock: Number(p.stock || 0),
          price: Number(p.price || 0),
          category: p.category || 'Unknown',
        }
      })
  }

  const handleGenerate = async () => {
    setError('')
    setInsightText('')
    setLoading(true)
    try {
      const products = buildProductPayload()
      if (!products || products.length === 0) {
        setError('No product data available to analyze.')
        setLoading(false)
        return
      }

      const res = await generateSalesInsights(products)
      setInsightText(res.reply || 'No insights returned.')
    } catch (err) {
      console.error('AI sales insights error:', err)
      setError(err.message || 'Failed to generate insights.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-sales-insights-card" style={{ marginTop: 18, padding: 12, border: '1px solid #e6e6e6', borderRadius: 8, background: '#fff' }}>
      <div className="ai-sales-insights-header" style={{ marginBottom: 12 }}>
        <div className="ai-sales-insights-title">
          <strong>AI Sales Insights</strong>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>On-demand AI-generated recommendations, inventory alerts and revenue opportunities based on current orders and product data.</div>
        </div>
        <div className="ai-sales-insights-actions">
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate AI Insights'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}

      {insightText ? (
        <div className="ai-sales-insights-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {insightText}
        </div>
      ) : (
        <div style={{ color: '#6b7280', fontSize: 13 }}>No insights yet. Click "Generate AI Insights" to analyze current sales data.</div>
      )}
    </div>
  )
}
