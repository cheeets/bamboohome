import React, { useState, useEffect } from 'react'
import { db } from '../services/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { ImagePlus, UploadCloud } from 'lucide-react'
import '../css/ProductModal.css'

export function ProductModal({ isOpen, category, editingProduct, onClose, onProductAdded }) {
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [description, setDescription] = useState('')
  const [stock, setStock] = useState('10')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [modalCategory, setModalCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const { user, storeName } = useAuth()

  const [imagePreview, setImagePreview] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = React.useRef(null)

  // Fetch categories from Firestore
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true)
        const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        const categoriesList = []
        querySnapshot.forEach((doc) => {
          categoriesList.push({
            id: doc.id,
            ...doc.data(),
          })
        })
        setCategories(categoriesList)
      } catch (err) {
        console.error('Error fetching categories:', err)
        setCategories([])
      } finally {
        setLoadingCategories(false)
      }
    }

    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  // Populate form when editing or category changes
  useEffect(() => {
    if (category) {
      setModalCategory(category)
    }
    
    if (editingProduct) {
      setProductName(editingProduct.name || '')
      setPrice(editingProduct.price || '')
      setImageUrl(editingProduct.imageUrl || '')
      setImagePreview(editingProduct.imageUrl || '')
      setDescription(editingProduct.description || '')
      setStock(editingProduct.stock || '10')
      setLowStockThreshold(editingProduct.lowStockThreshold || '5')
      setImageFile(null)
    } else {
      resetForm()
    }
  }, [editingProduct, isOpen, category])

  const resetForm = () => {
    setProductName('')
    setPrice('')
    setDescription('')
    setStock('10')
    setLowStockThreshold('5')
    setImageFile(null)
    setImageUrl('')
    setImagePreview('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImageSelection = (file) => {
    if (file) {
      // Validation: Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB. We will attempt to compress it.')
      } else {
        setError('')
      }

      setImageFile(file)
      
      // Image Preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageChange = (e) => {
    handleImageSelection(e.target.files?.[0])
  }

  const handleImageDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    handleImageSelection(e.dataTransfer.files?.[0])
  }

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Max dimensions
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            }))
          }, 'image/jpeg', 0.8) // 0.8 quality
        }
      }
    })
  }

  const uploadToCloudinary = async (fileToUpload) => {
    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('upload_preset', 'GreenNest')

    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dimkq64zx/image/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      setUploadingImage(false)
      return data.secure_url
    } catch (err) {
      setError('Error uploading image: ' + err.message)
      setUploadingImage(false)
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!productName || !price) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      if (!editingProduct && !imageFile) {
        setError('Please select an image for new products')
        setLoading(false)
        return
      }

      // Process and upload image if new file selected
      let finalImageUrl = imageUrl
      if (imageFile) {
        let fileToUpload = imageFile
        // Auto-compress if > 1MB
        if (imageFile.size > 1 * 1024 * 1024) {
          fileToUpload = await compressImage(imageFile)
        }
        
        finalImageUrl = await uploadToCloudinary(fileToUpload)
        if (!finalImageUrl) {
          setLoading(false)
          return
        }
      }

      const productData = {
        name: productName,
        price: parseFloat(price),
        imageUrl: finalImageUrl,
        description: description || '',
        stock: parseInt(stock) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
        category: modalCategory,
        sellerId: user.uid,
        storeName: editingProduct?.storeName || storeName || 'GreenNest',
      }

      if (editingProduct) {
        // Update existing product
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          updatedAt: serverTimestamp(),
        })
      } else {
        // Add new product
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp(),
        })
      }

      resetForm()
      onProductAdded()
      onClose()
    } catch (err) {
      setError('Error saving product: ' + err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay1" onClick={onClose}>
      <div className="modal-content1" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-group">
            <label htmlFor="productName">Product Name *</label>
            <input
              type="text"
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price *</label>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            {loadingCategories ? (
              <select id="category" disabled>
                <option>Loading categories...</option>
              </select>
            ) : categories.length === 0 ? (
              <div style={{ padding: '10px', color: '#d97706', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '14px' }}>
                No categories found. Please ask your admin to create categories first.
              </div>
            ) : (
              <select
                id="category"
                value={modalCategory}
                onChange={(e) => setModalCategory(e.target.value)}
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product description (optional)"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="stock">Stock Quantity *</label>
            <input
              type="number"
              id="stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Enter stock quantity"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lowStockThreshold">Low Stock Threshold *</label>
            <input
              type="number"
              id="lowStockThreshold"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder="Alert when stock is below this number"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Product Image {!editingProduct && '*'}</label>
            <div className="image-upload-container">
              <div
                className={`upload-dropzone ${isDragOver ? 'drag-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleImageDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
              >
                <div className="upload-dropzone-icon">
                  <UploadCloud size={26} />
                </div>
                <p className="upload-dropzone-title">Upload product image</p>
                <p className="upload-dropzone-text">
                  Click to choose an image or drag and drop it here
                </p>
                <span className="upload-dropzone-hint">PNG, JPG, or WEBP recommended</span>
              </div>
              <input
                type="file"
                id="image"
                onChange={handleImageChange}
                accept="image/*"
                className="file-input"
                required={!editingProduct}
                ref={fileInputRef}
              />
              <div className="image-preview-wrapper">
                {imagePreview ? (
                  <div className="image-preview-card">
                    <div className="image-preview-header">
                      <div className="image-preview-title">
                        <ImagePlus size={16} />
                        <span>Selected product image</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-image"
                        onClick={() => {
                          setImageFile(null)
                          setImageUrl('')
                          setImagePreview('')
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    {imageFile && (
                      <p className="image-file-name">{imageFile.name}</p>
                    )}
                  </div>
                ) : (
                  <div className="image-placeholder">
                    <span>No Image Selected</span>
                  </div>
                )}
              </div>
            </div>
            {uploadingImage && <p className="uploading-text">Uploading image...</p>}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="btn btn-primary btn-full"
            >
              {loading ? 'Saving...' : uploadingImage ? 'Uploading Image...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-full"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
