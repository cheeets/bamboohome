import React, { useState } from 'react'
import { formatPrice } from '../utils/rating'

export default function AdminSalesInsights({ allOrders = [], allProducts = [] }) {
  const [loading, setLoading] = useState(false)
  const [insightText, setInsightText] = useState('')
  const [error, setError] = useState('')

  const buildProductPayload = () => {
    // Build sold counts keyed by product name or id
    const soldMap = {}
    allOrders.forEach((order) => {
      ;(order.products || order.items || []).forEach((item) => {
        const key = item.productId || item.id || item.name || 'Unknown Product'
        const qty = Number(item.quantity || item.qty || item.amount || 1)
        soldMap[key] = (soldMap[key] || 0) + qty
      })
    })

    // Map through products and attach sold counts
    return allProducts
      .filter(p => !p.deleted)
      .map((p) => ({
        id: p.id,
        name: p.name || 'Unnamed',
        sold: soldMap[p.id] || soldMap[p.name] || 0,
        stock: Number(p.stock || 0),
        price: Number(p.price || 0),
        category: p.category || 'Unknown',
      }))
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

      const res = await fetch('/api/sales-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      })

      const body = await res.json()
      if (!res.ok || !body.success) {
        setError(body.error || 'AI analysis failed. Check backend logs or API keys.')
        setLoading(false)
        return
      }

      setInsightText(body.reply || 'No insights returned.')
    } catch (err) {
      console.error('AI insights error:', err)
      setError('Failed to generate insights: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 18, padding: 12, border: '1px solid #e6e6e6', borderRadius: 8, background: '#fff' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <strong>AI Sales Insights</strong>
          <div style={{ fontSize: 13, color: '#6b7280' }}>On-demand AI-generated recommendations, inventory alerts and revenue opportunities based on current orders and product data.</div>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate AI Insights'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}

      {insightText ? (
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {insightText}
        </div>
      ) : (
        <div style={{ color: '#6b7280', fontSize: 13 }}>No insights yet. Click "Generate AI Insights" to analyze current sales data.</div>
      )}
    </div>
  )
}
