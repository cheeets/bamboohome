import React, { useState } from 'react'
import '../css/AttributeSelector.css'

export function AttributeSelector({ product, onClose, onSelectAttributes }) {
  const [selectedAttributes, setSelectedAttributes] = useState({})
  const [quantity, setQuantity] = useState(1)

  const handleAttributeChange = (attributeName, value) => {
    setSelectedAttributes({
      ...selectedAttributes,
      [attributeName]: value,
    })
  }

  const handleAddToCart = () => {
    // Check if all attributes are selected
    if (product.attributes && product.attributes.length > 0) {
      for (const attr of product.attributes) {
        if (!selectedAttributes[attr.name]) {
          alert(`Please select a ${attr.name.toLowerCase()}`)
          return
        }
      }
    }

    onSelectAttributes({
      ...product,
      selectedAttributes,
      quantity,
    })
  }

  return (
    <div className="attribute-selector-overlay" onClick={onClose}>
      <div className="attribute-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="attr-modal-header">
          <h2>Select Options</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="attr-modal-content">
          <div className="product-preview">
            <img src={product.imageUrl} alt={product.name} />
            <div className="product-info-preview">
              <h3>{product.name}</h3>
              <p className="price">₱{product.price.toFixed(2)}</p>
            </div>
          </div>

          {/* Attributes Selection */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="attributes-selection">
              {product.attributes.map((attribute) => (
                <div key={attribute.name} className="attribute-selection">
                  <label className="section-label">{attribute.name}:</label>
                  <div className="variant-options">
                    {attribute.variants.map((variant) => (
                      <button
                        key={`${attribute.name}-${variant.value}`}
                        className={`variant-option ${selectedAttributes[attribute.name] === variant.value ? 'selected' : ''}`}
                        onClick={() => handleAttributeChange(attribute.name, variant.value)}
                        disabled={variant.stock <= 0}
                      >
                        <span className="variant-name">{variant.value}</span>
                        <span className="variant-stock">
                          {variant.stock > 0 ? `${variant.stock}` : 'Out of stock'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity Section */}
          <div className="quantity-section">
            <label className="section-label">Quantity:</label>
            <div className="quantity-control">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="qty-btn"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1
                  setQuantity(Math.max(1, val))
                }}
                min="1"
                className="qty-input"
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="qty-btn"
              >
                +
              </button>
            </div>
          </div>

          <div className="attr-modal-actions">
            <button
              className="btn-add"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
            <button
              className="btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
