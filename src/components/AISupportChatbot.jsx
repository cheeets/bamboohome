import React, { useEffect, useMemo, useRef, useState } from 'react'
import { askSellerSupport, askBuyerSupport } from '../services/aiService'
import { MessageCircle, Minus, X } from 'lucide-react'
import '../css/SellerSupportChatbot.css'

const initialAssistantMessage = (userRole, isSuspended) => {
  if (userRole === 'seller' && isSuspended) {
    return {
      role: 'assistant',
      content:
        'Your account is currently suspended. I can explain the provided reason, remaining time, marketplace rules, and how to request a review. I cannot remove or override the suspension.',
      timestamp: new Date()
    }
  }

  return {
    role: 'assistant',
    content:
      'Hi! I’m Bamboo Home AI Support. How can I help you today?',
    timestamp: new Date()
  }
}

const sellerSuggestions = [
  'How do I add a product?',
  'How do I update product stock?',
  'How do I process a pending order?',
  'How do I view my sales analytics?',
  'Why is my product not visible?',
  'How can I improve my sales?',
  'How do I avoid seller violations?',
]

const suspendedSellerSuggestions = [
  'Why was my account suspended?',
  'How long will my suspension last?',
  'What should I do while suspended?',
  'How can I avoid another suspension?',
  'How can I request a review?',
  'Can the AI remove my suspension?',
]

const buyerSuggestions = [
  'How do I order a product?',
  'How do I contact a seller?',
  'How do I track my order?',
  'What payment methods are available?',
  'How do I view my order history?',
  'How do I update my profile?',
]

export default function AISupportChatbot({
  userRole,
  isSuspended,
  suspensionReason,
  suspensionTimeRemaining,
  sellerName,
  storeName,
  userName,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([initialAssistantMessage(userRole, isSuspended)])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const suggestions = useMemo(() => {
    if (userRole === 'seller') {
      return isSuspended ? suspendedSellerSuggestions : sellerSuggestions
    }
    return buyerSuggestions
  }, [userRole, isSuspended])

  useEffect(() => {
    setMessages([initialAssistantMessage(userRole, isSuspended)])
    setError('')
    setInputValue('')
  }, [userRole, isSuspended])

  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const handleSend = async (event) => {
    event.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading) {
      return
    }

    const userMessage = { role: 'user', content: trimmed, timestamp: new Date() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setError('')
    setIsLoading(true)

    try {
      const history = updatedMessages.slice(-10).map((message) => ({
        role: message.role,
        content: message.content,
      }))

      let reply
      if (userRole === 'seller') {
        reply = await askSellerSupport({
          message: trimmed,
          isSuspended,
          suspensionReason,
          suspensionTimeRemaining,
          sellerName,
          storeName,
          history,
        })
      } else {
        reply = await askBuyerSupport({
          message: trimmed,
          userName,
          history,
        })
      }

      setMessages((current) => [...current, { role: 'assistant', content: reply, timestamp: new Date() }])
    } catch (err) {
      setError(err.message || 'Unable to get a response from the support assistant.')
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'I could not complete that request. Please try again or contact administrator support.',
          timestamp: new Date()
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (question) => {
    setInputValue(question)
  }

  return (
    <div className={`floating-chatbot-container ${isOpen ? 'chat-open' : ''}`}>
      {/* Floating Button */}
      <button
        type="button"
        className="floating-chat-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className={`chat-panel ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="chat-panel-header">
            <div className="chat-header-content">
              <div className="chat-bot-icon">
                <MessageCircle size={20} />
              </div>
              <div className="chat-header-text">
                <h3>Bamboo Home AI Support</h3>
                <span className="online-status">
                  <span className="status-dot"></span>
                  Online
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                className="chat-header-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? 'Maximize chat' : 'Minimize chat'}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                className="chat-header-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="chat-panel-content">
              {/* Messages */}
              <div className="chat-messages-container" role="log" aria-live="polite">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`chat-message ${message.role === 'user' ? 'user' : 'assistant'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="chat-avatar">
                        <MessageCircle size={18} />
                      </div>
                    )}
                    <div className="chat-message-wrapper">
                      <div className="chat-message-bubble">
                        {message.content}
                      </div>
                      {message.timestamp && (
                        <span className="chat-message-time">
                          {formatTime(message.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="chat-message assistant">
                    <div className="chat-avatar">
                      <MessageCircle size={18} />
                    </div>
                    <div className="chat-message-wrapper">
                      <div className="chat-message-bubble typing-bubble">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              <div className="chat-suggestions">
                {suggestions.map((question, index) => (
                  <button
                    key={`suggestion-${index}`}
                    type="button"
                    className="chat-suggestion-btn"
                    onClick={() => handleSuggestionClick(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form className="chat-input-form" onSubmit={handleSend}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Bamboo Home Support..."
                  className="chat-input"
                  disabled={isLoading}
                  aria-disabled={isLoading}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!inputValue.trim() || isLoading}
                  aria-disabled={!inputValue.trim() || isLoading}
                >
                  Send
                </button>
              </form>

              {/* Error */}
              {error && <div className="chat-error-message">{error}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

AISupportChatbot.defaultProps = {
  userRole: 'user',
  isSuspended: false,
  suspensionReason: '',
  suspensionTimeRemaining: '',
  sellerName: '',
  storeName: '',
  userName: '',
}
