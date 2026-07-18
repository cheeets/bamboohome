import React, { useEffect, useMemo, useRef, useState } from 'react'
import { askSellerSupport } from '../services/aiService'
import '../css/SellerSupportChatbot.css'

const initialAssistantMessage = (isSuspended) => {
  if (isSuspended) {
    return {
      role: 'assistant',
      content:
        'Your account is currently suspended. I can explain the provided reason, remaining time, marketplace rules, and how to request a review. I cannot remove or override the suspension.',
    }
  }

  return {
    role: 'assistant',
    content:
      'Welcome to Bamboo Home Seller Support. Ask me about managing products, inventory, orders, analytics, notifications, or seller responsibilities.',
  }
}

const normalSuggestions = [
  'How do I add a product?',
  'How do I update product stock?',
  'How do I process a pending order?',
  'How do I mark an order as delivered?',
  'How do I view my sales analytics?',
  'Why is my product not visible?',
  'How can I improve my sales?',
  'How do I avoid seller violations?',
]

const suspendedSuggestions = [
  'Why was my account suspended?',
  'How long will my suspension last?',
  'What should I do while suspended?',
  'How can I avoid another suspension?',
  'How can I request a review?',
  'Can the AI remove my suspension?',
]

export default function SellerSupportChatbot({
  isSuspended,
  suspensionReason,
  suspensionTimeRemaining,
  sellerName,
  storeName,
}) {
  const [messages, setMessages] = useState([initialAssistantMessage(isSuspended)])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const pageTitle = isSuspended ? 'Seller Support Assistant' : 'AI Seller Support'
  const pageSubtitle = isSuspended
    ? 'Get guidance about your suspension, marketplace rules, and review process.'
    : 'Ask questions about products, orders, inventory, analytics, and seller responsibilities.'

  const suggestions = useMemo(
    () => (isSuspended ? suspendedSuggestions : normalSuggestions),
    [isSuspended]
  )

  useEffect(() => {
    setMessages([initialAssistantMessage(isSuspended)])
    setError('')
    setInputValue('')
  }, [isSuspended])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const clearChat = () => {
    setMessages([initialAssistantMessage(isSuspended)])
    setInputValue('')
    setError('')
  }

  const handleSend = async (event) => {
    event.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) {
      setError('Please enter a question before sending.')
      return
    }

    const userMessage = { role: 'user', content: trimmed }
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

      const reply = await askSellerSupport({
        message: trimmed,
        isSuspended,
        suspensionReason,
        suspensionTimeRemaining,
        sellerName,
        storeName,
        history,
      })

      setMessages((current) => [...current, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message || 'Unable to get a response from the support assistant.')
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'I could not complete that request. Please try again or contact administrator support.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="seller-support-chatbot">
      <div className="chatbot-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
        <button type="button" className="chatbot-clear-btn" onClick={clearChat}>
          Clear chat
        </button>
      </div>

      <div className="seller-support-messages chatbot-messages" role="log" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`seller-support-message chatbot-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-label">
              {message.role === 'user' ? 'You' : 'Support'}
            </div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-suggestions">
        {suggestions.map((question) => (
          <button
            key={question}
            type="button"
            className="chatbot-suggestion-button"
            onClick={() => setInputValue(question)}
          >
            {question}
          </button>
        ))}
      </div>

      <form className="seller-support-input-area chatbot-input-row" onSubmit={handleSend}>
        <label htmlFor="seller-support-input" className="sr-only">
          Enter your question
        </label>
        <input
          id="seller-support-input"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Ask your question here"
          className="chatbot-input"
          disabled={isLoading}
          aria-disabled={isLoading}
        />
        <button type="submit" className="chatbot-send-button" disabled={isLoading}>
          {isLoading ? 'Sending…' : 'Send'}
        </button>
      </form>

      {error && <div className="chatbot-error">{error}</div>}
    </div>
  )
}

SellerSupportChatbot.defaultProps = {
  isSuspended: false,
  suspensionReason: '',
  suspensionTimeRemaining: '',
  sellerName: '',
  storeName: '',
}
