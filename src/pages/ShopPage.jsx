import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { ProductCard } from '../components/ProductCard'
import { ProductModal } from '../components/ProductModal'
import '../css/ShopPage.css'

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'chair', name: 'Chair' },
  { id: 'table', name: 'Table' },
  { id: 'sofa', name: 'Sofa' },
]

export function ShopPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedStore, setSelectedStore] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [modalCategory, setModalCategory] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const { user, userRole } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      let q

      if (selectedCategory && selectedCategory !== 'all') {
        q = query(collection(db, 'products'), where('category', '==', selectedCategory))
      } else {
        q = query(collection(db, 'products'), orderBy('createdAt', 'desc'))
      }

      const querySnapshot = await getDocs(q)
      const productList = []

      querySnapshot.forEach((doc) => {
        productList.push({
          id: doc.id,
          ...doc.data(),
          storeName: doc.data().storeName || 'GreenNest',
          sellerId: doc.data().sellerId, // Ensure sellerId is preserved
        })
      })

      setProducts(productList)
      setError('')
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const stores = Array.from(new Set(products.map((p) => p.storeName).filter(Boolean)))

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      product.name.toLowerCase().includes(searchLower) || 
      (product.storeName && product.storeName.toLowerCase().includes(searchLower))
    const matchesStore = selectedStore === 'all' ? true : product.storeName === selectedStore
    return matchesSearch && matchesStore
  })

  return (
    <div className="product-page">
      {/* Header Section */}
      <section className="product-header">
        <div className="product-header-content">
          <h1>Our Collection</h1>
          <p>Discover our premium bamboo furniture collection</p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="product-filter-section">
        <div className="filter-container">
          {/* Categories */}
          <div className="categories-wrapper">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-modern"
            />
          </div>

          {/* Store Filter */}
          <div className="search-wrapper">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="search-input-modern"
              aria-label="Filter by store"
            >
              <option value="all">All Stores</option>
              {stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

        </div>
      </section>

      {/* Products Section */}
      <section className="products-section-modern">
        {loading && <div className="loading">Loading products...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && filteredProducts.length === 0 && (
          <div className="empty-state">
            <p>No products available.</p>
          </div>
        )}

        {!loading && filteredProducts.length > 0 && (
          <div className="products-grid-modern">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={(id) => navigate(`/product/${id}`)}
                onProductUpdated={() => fetchProducts()}
                onEditProduct={(productToEdit) => {
                  setEditingProduct(productToEdit)
                  setModalCategory(productToEdit.category)
                  setShowProductModal(true)
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Product Modal */}
      <ProductModal
        isOpen={showProductModal}
        category={modalCategory}
        editingProduct={editingProduct}
        onClose={() => {
          setShowProductModal(false)
          setEditingProduct(null)
          setModalCategory(null)
        }}
        onProductAdded={() => fetchProducts()}
      />
    </div>
  )
}
