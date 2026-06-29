import React, { createContext, useContext, useState } from 'react'

const ConfirmationContext = createContext()

export function ConfirmationProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState({
    title: '',
    message: '',
    warningText: '',
    onConfirm: () => {},
    onCancel: () => {},
  })

  const openConfirmation = (newConfig) => {
    console.log('openConfirmation called with:', newConfig)
    setConfig(newConfig)
    setIsOpen(true)
  }

  const closeConfirmation = () => {
    console.log('closeConfirmation called')
    setIsOpen(false)
    setConfig({
      title: '',
      message: '',
      warningText: '',
      onConfirm: () => {},
      onCancel: () => {},
    })
  }

  const handleConfirm = () => {
    console.log('handleConfirm called')
    config.onConfirm()
    closeConfirmation()
  }

  const handleCancel = () => {
    console.log('handleCancel called')
    config.onCancel?.()
    closeConfirmation()
  }

  return (
    <ConfirmationContext.Provider
      value={{
        isOpen,
        config,
        openConfirmation,
        closeConfirmation,
        handleConfirm,
        handleCancel,
      }}
    >
      {children}
    </ConfirmationContext.Provider>
  )
}

export function useConfirmation() {
  return useContext(ConfirmationContext)
}
