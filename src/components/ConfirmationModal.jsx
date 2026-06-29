import React from 'react'
import { X } from 'lucide-react'
import { useConfirmation } from '../context/ConfirmationContext'
import '../css/ConfirmationModal.css'

export function ConfirmationModal() {
  const { isOpen, config, handleConfirm, handleCancel } = useConfirmation()
  console.log('ConfirmationModal rendering:', { isOpen, config })

  if (!isOpen) return null

  return (
    <div className="confirmation-modal-overlay" onClick={handleCancel}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{config.title}</h2>
          <button className="modal-close" onClick={handleCancel}>
            <X size={20} />
          </button>
        </div>
        <div className="confirmation-modal-body">
          <p className="confirmation-message">{config.message}</p>
          {config.warningText && (
            <p className="confirmation-warning">{config.warningText}</p>
          )}
        </div>
        <div className="confirmation-modal-footer">
          <button className="btn-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
