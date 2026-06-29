import React, { useState, useEffect } from 'react'
import { useConfirmation } from '../context/ConfirmationContext'
import { 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  Tag,
  Save,
  X
} from 'lucide-react'
import { db } from '../services/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { Toast } from './Toast'
import '../css/AdminCategoriesDashboard.css'

export default function AdminCategoriesDashboard() {
  const { openConfirmation } = useConfirmation()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📦',
  })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      const categoryList = []

      querySnapshot.forEach((doc) => {
        categoryList.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setCategories(categoryList)
      setError('')
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setToastMessage('Category name is required')
      setToastType('error')
      return
    }

    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      setCategories([
        {
          id: docRef.id,
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...categories,
      ])

      setFormData({ name: '', description: '', icon: '📦' })
      setShowAddModal(false)
      setToastMessage('Category created successfully')
      setToastType('success')
    } catch (err) {
      console.error('Error adding category:', err)
      setToastMessage('Failed to create category: ' + err.message)
      setToastType('error')
    }
  }

  const handleUpdateCategory = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setToastMessage('Category name is required')
      setToastType('error')
      return
    }

    try {
      const categoryRef = doc(db, 'categories', editingId)
      await updateDoc(categoryRef, {
        ...formData,
        updatedAt: new Date(),
      })

      setCategories(
        categories.map((cat) =>
          cat.id === editingId
            ? {
                ...cat,
                ...formData,
                updatedAt: new Date(),
              }
            : cat
        )
      )

      setFormData({ name: '', description: '', icon: '📦' })
      setEditingId(null)
      setToastMessage('Category updated successfully')
      setToastType('success')
    } catch (err) {
      console.error('Error updating category:', err)
      setToastMessage('Failed to update category: ' + err.message)
      setToastType('error')
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    openConfirmation({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category?',
      onConfirm: async () => {
        try {
          const categoryRef = doc(db, 'categories', categoryId)
          await deleteDoc(categoryRef)

          setCategories(categories.filter((cat) => cat.id !== categoryId))
          setToastMessage('Category deleted successfully')
          setToastType('success')
        } catch (err) {
          console.error('Error deleting category:', err)
          setToastMessage('Failed to delete category: ' + err.message)
          setToastType('error')
        }
      }
    })
  }

  const handleEditClick = (category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📦',
    })
    setEditingId(category.id)
    setShowAddModal(false)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', icon: '📦' })
  }

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <div className="admin-categories-loading">Loading categories...</div>
  }

  return (
    <div className="admin-categories-dashboard">
      <div className="dashboard-header">
        <div className="header-title">
          <Tag size={28} />
          <div>
            <h1>Category Management</h1>
            <p>Create, edit, and manage product categories</p>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingId(null)
            setFormData({ name: '', description: '', icon: '📦' })
            setShowAddModal(true)
          }}
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showAddModal && !editingId && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Category</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="form-group">
                <label>Icon</label>
                <input
                  type="text"
                  maxLength="2"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📦"
                />
              </div>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Plants, Seeds, Tools"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Category description (optional)"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={16} /> Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingId && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Category</h2>
              <button className="close-btn" onClick={handleCancelEdit}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateCategory}>
              <div className="form-group">
                <label>Icon</label>
                <input
                  type="text"
                  maxLength="2"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📦"
                />
              </div>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Plants, Seeds, Tools"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Category description (optional)"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={16} /> Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="categories-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Tag size={48} />
            <p>{searchTerm ? 'No categories found' : 'No categories yet. Create one to get started!'}</p>
          </div>
        ) : (
          filtered.map((category) => (
            <div key={category.id} className="category-card">
              <div className="category-icon">{category.icon}</div>
              <h3>{category.name}</h3>
              {category.description && <p>{category.description}</p>}
              <div className="category-actions">
                <button
                  className="btn-edit"
                  onClick={() => handleEditClick(category)}
                  title="Edit category"
                >
                  <Edit size={16} />
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteCategory(category.id)}
                  title="Delete category"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  )
}
