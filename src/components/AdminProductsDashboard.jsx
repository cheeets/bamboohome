import React, { useState, useEffect } from 'react'
import { 
  Trash2, 
  Edit, 
  Package, 
  Search, 
  Store, 
} from 'lucide-react'
import { db } from '../services/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { formatPrice } from '../utils/rating'
import '../css/AdminProductsDashboard.css'

export default function AdminProductsDashboard({ allProducts, onDeleteProduct, onUpdateStock, onEditProduct }) {
  const [search, setSearch] = useState('')
  const [sellerFilter, setSellerFilter] = useState('all')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('name', 'asc'))
      const querySnapshot = await getDocs(q)
      const list = []
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setCategories(list)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.name : categoryId || 'Uncategorized'
  }

  const activeProducts = allProducts.filter((p) => !p.deleted)

  const sellers = React.useMemo(() => {
    const sellerMap = new Map()
    activeProducts.forEach(p => {
      if (p.sellerId && !sellerMap.has(p.sellerId)) {
        sellerMap.set(p.sellerId, p.storeName || p.sellerId)
      }
    })
    return Array.from(sellerMap.entries()).map(([id, name]) => ({ id, name }))
  }, [activeProducts])

  const filtered = activeProducts.filter((p) => {
    const searchLower = search.toLowerCase()
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchLower) || 
      p.storeName?.toLowerCase().includes(searchLower) ||
      p.id?.toLowerCase().includes(searchLower)
      
    const matchesSeller = sellerFilter === 'all' || p.sellerId === sellerFilter
    return matchesSearch && matchesSeller
  })

  return (
    <div className="admin-products-dashboard">
      <div className="dashboard-header">
        <div className="header-title">
          <Package size={28} />
          <div>
            <h1>Global Inventory</h1>
            <p>Monitor and manage platform-wide product catalog</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="mini-stat">
            <span className="label">Total SKUs</span>
            <span className="value">{activeProducts.length}</span>
          </div>
          <div className="mini-stat">
            <span className="label">Low Stock</span>
            <span className="value danger">
              {activeProducts.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 5)).length}
            </span>
          </div>
        </div>
      </div>

      <div className="controls-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search catalog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Store size={16} />
          <select
            className="seller-filter"
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
          >
            <option value="all">All Merchants</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="products-table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Inventory</th>
              <th>Health Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">No products found in the catalog</td>
              </tr>
            ) : (
              filtered.map((product) => {
                const isLowStock = (product.stock || 0) <= (product.lowStockThreshold || 5)
                const isOutOfStock = (product.stock || 0) <= 0

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-image-container">
                          <img src={product.imageUrl} alt={product.name} className="product-thumb" />
                        </div>
                        <div className="product-meta">
                          <span className="name">{product.name}</span>
                          <span className="sku">ID: {product.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="merchant-cell">
                        <span className="merchant-name">{product.storeName || 'GreenNest'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="category-tag">{getCategoryName(product.category)}</span>
                    </td>
                    <td>
                      <span className="price-value">{formatPrice(product.price)}</span>
                    </td>
                    <td>
                      <div className="stock-control">
                        <input
                          type="number"
                          className={`stock-input ${isLowStock ? 'danger' : ''}`}
                          defaultValue={product.stock}
                          onBlur={(e) => onUpdateStock(product.id, e.target.value)}
                        />
                        <span className="unit">pcs</span>
                      </div>
                    </td>
                    <td>
                      <div className={`status-pill ${isOutOfStock ? 'out' : isLowStock ? 'low' : 'active'}`}>
                        <div className="dot"></div>
                        {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy'}
                      </div>
                    </td>
                    <td>
                      <div className="action-cell">
                        <button className="icon-btn edit" onClick={() => onEditProduct(product.id, product)} title="Edit Details">
                          <Edit size={16} />
                        </button>
                        <button className="icon-btn delete" onClick={() => {
                          if (window.confirm(`Permanently remove ${product.name} from catalog?`)) {
                            onDeleteProduct(product.id)
                          }
                        }} title="Remove Product">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
