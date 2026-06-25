import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { ProductCard } from '../components/ProductCard'
import { ProductModal } from '../components/ProductModal'
import { BuyerLayout } from '../components/BuyerLayout'
import { Search, Store, SlidersHorizontal } from 'lucide-react'
import '../css/ShopPage.css'

export function ShopPage() {
  const { user, userRole } = useAuth()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([{ id: 'all', name: 'All' }])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStore, setSelectedStore] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [showProductModal, setShowProductModal] = useState(false)
  const [modalCategory, setModalCategory] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const productsPerPage = 12
  const isGuest = !user || userRole !== 'user'

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('name', 'asc'))
      const querySnapshot = await getDocs(q)
      const categoriesList = [{ id: 'all', name: 'All' }]
      querySnapshot.forEach((doc) => {
        categoriesList.push({ id: doc.id, name: doc.data().name, ...doc.data() })
      })
      setCategories(categoriesList)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : categoryId || 'Uncategorized'
  }

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
      const productList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        storeName: doc.data().storeName || 'GreenNest',
        sellerId: doc.data().sellerId,
      }))
      setProducts(productList)
      setError('')
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('Failed to fetch products. Please try again later.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const stores = Array.from(new Set(products.map((p) => p.storeName).filter(Boolean)))

  const filteredProducts = React.useMemo(() => {
    const filtered = products.filter((product) => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        product.name.toLowerCase().includes(searchLower) ||
        (product.storeName && product.storeName.toLowerCase().includes(searchLower))
      const matchesStore = selectedStore === 'all' ? true : product.storeName === selectedStore
      return matchesSearch && matchesStore
    })

    const parseCreatedAt = (value) => {
      if (!value) return 0
      if (value?.toDate) return value.toDate().getTime()
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
    }

    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    } else if (sortBy === 'name-asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else {
      filtered.sort((a, b) => parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt))
    }
    return filtered
  }, [products, searchTerm, selectedStore, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedStore, searchTerm, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage))
  const paginatedProducts = React.useMemo(() => {
    const start = (currentPage - 1) * productsPerPage
    return filteredProducts.slice(start, start + productsPerPage)
  }, [filteredProducts, currentPage])

  const visiblePages = React.useMemo(() => {
    const pages = []
    const start = Math.max(1, currentPage - 1)
    const end = Math.min(totalPages, start + 2)
    for (let i = start; i <= end; i += 1) pages.push(i)
    return pages
  }, [currentPage, totalPages])

  return (
    <BuyerLayout guest={isGuest}>
      <div className="shop-panel">
        <div className="panel-header">
          <div className="panel-header-text">
            <h1>Shop</h1>
            <p>Discover handcrafted bamboo furniture from local artisans.</p>
          </div>
          <div className="panel-header-actions">
            <div className="shop-inline-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Filter in shop..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="sort-wrap">
              <label htmlFor="shop-sort">
                <SlidersHorizontal size={14} />
                Sort
              </label>
              <select
                id="shop-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A–Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="shop-filters-row">
          <div className="categories-wrapper">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="store-select-wrapper">
            <Store size={15} className="store-icon" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="store-select"
              aria-label="Filter by store"
            >
              <option value="all">All Stores</option>
              {stores.map((store) => (
                <option key={store} value={store}>{store}</option>
              ))}
            </select>
          </div>
        </div>

        {!loading && (
          <p className="shop-results-count">{filteredProducts.length} products found</p>
        )}

        {loading && <div className="loading">Loading products...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && filteredProducts.length === 0 && (
          <div className="empty-state">
            <p>No products available.</p>
          </div>
        )}

        {!loading && filteredProducts.length > 0 && (
          <div className="products-grid-modern">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                variant="shop"
                product={{ ...product, categoryName: getCategoryName(product.category) }}
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

        {!loading && filteredProducts.length > 0 && totalPages > 1 && (
          <div className="pagination-row">
            <button
              type="button"
              className="page-btn nav"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            {visiblePages.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              className="page-btn nav"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        )}
      </div>

      <ProductModal
        isOpen={showProductModal}
        category={modalCategory}
        editingProduct={editingProduct}
        onClose={() => {
          setShowProductModal(false)
          setEditingProduct(null)
          setModalCategory('')
        }}
        onProductAdded={() => fetchProducts()}
      />
    </BuyerLayout>
  )
}
