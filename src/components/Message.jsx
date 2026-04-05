import React, { useState, useEffect, useRef } from 'react'
import { db } from '../services/firebase'
import { collection, query, where, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore'
import '../css/Messaging.css'

export function Message({ user, userRole, displayName, isOpen, onClose, otherUserId, otherUserName }) {
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesUnsubscribeRef = useRef(null)

  useEffect(() => {
    if (isOpen && otherUserId) {
      setupMessagesListener()
    } else {
      // Cleanup listeners when modal closes
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current()
      }
    }
    
    return () => {
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current()
      }
    }
  }, [isOpen, otherUserId])

  // auto-scroll to latest message when messages change or modal opens
  useEffect(() => {
    if (!messagesEndRef.current) return
    // use requestAnimationFrame to wait for DOM updates
    const raf = requestAnimationFrame(() => {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      } catch (e) {
        messagesEndRef.current.scrollIntoView()
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [messages, isOpen])


  // Setup real-time listener for direct messages between two users
  const setupMessagesListener = async () => {
    if (!otherUserId) return
    
    setLoadingMessages(true)
    try {
      // Query messages where both participants are involved (in either order)
      const messagesQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.uid),
        orderBy('createdAt', 'asc')
      )

      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current()
      }

      messagesUnsubscribeRef.current = onSnapshot(messagesQuery, (messagesSnapshot) => {
        const userMessages = messagesSnapshot.docs
          .filter(doc => {
            const data = doc.data()
            const participants = data.participants || []
            // Filter to only messages with current user and the other user
            return participants.includes(user.uid) && participants.includes(otherUserId)
          })
          .map(doc => ({ id: doc.id, ...doc.data() }))
        
        setMessages(userMessages)
        setLoadingMessages(false)
      }, (err) => {
        console.error('Error setting up messages listener:', err)
        setLoadingMessages(false)
      })
    } catch (err) {
      console.error('Error in setupMessagesListener:', err)
      setLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !otherUserId) return

    try {
      const participants = [user.uid, otherUserId]

      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: displayName,
        receiverId: otherUserId,
        participants,
        message: messageInput,
        createdAt: serverTimestamp(),
        isRead: false
      })

      setMessageInput('')
      // The listener will auto-update with the new message
    } catch (err) {
      console.error('Error sending message:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="messaging-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="messaging-modal-header">
          <h3>Message with {otherUserName || 'User'}</h3>
          <button 
            className="modal-close-btn1" 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="messages-container">
          {loadingMessages ? (
            <div className="loading-state">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message-bubble ${msg.senderId === user.uid ? 'sent' : 'received'}`}
                >
                  <p className="message-sender">{msg.senderName}</p>
                  <p className="message-text">{msg.message}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="message-input-area">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="message-input"
          />
          <button onClick={handleSendMessage} className="btn-send">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
