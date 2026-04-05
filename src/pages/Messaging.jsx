import React, { useState, useEffect } from 'react'
import { db } from '../services/firebase'
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import '../css/Messaging.css'

export function Messaging({ isModal = false, onClose = null }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [adminInfo, setAdminInfo] = useState(null)
  const [adminId, setAdminId] = useState(null)

  useEffect(() => {
    if (!user) return
    findAdminUser()
    if (!isModal) {
      fetchConversations()
      markAllMessagesAsRead()
    }
  }, [user, isModal])

  const markAllMessagesAsRead = async () => {
    try {
      const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.uid)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const batch = writeBatch(db)
        let count = 0
        snapshot.docs.forEach((msgDoc) => {
          const data = msgDoc.data()
          const isUnread = data.isRead !== true
          const isNotMe = (data.sender || data.senderId) !== user.uid
          // Only mark as read if it's currently unread AND we are not the sender
          if (isUnread && isNotMe) {
            batch.update(msgDoc.ref, { isRead: true })
            count++
          }
        })
        if (count > 0) {
          await batch.commit()
          console.log(`Marked ${count} messages as read`)
        }
      }
    } catch (err) {
      console.error('Error marking all messages as read:', err)
    }
  }

  const findAdminUser = async () => {
    try {
      // Query for user with admin role
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('role', '==', 'admin'))
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const adminUser = snapshot.docs[0]
        setAdminId(adminUser.id)
        
        // If modal mode, auto-load the admin chat
        if (isModal) {
          const conversationId = [user.uid, adminUser.id].sort().join('_')
          setSelectedConversation({
            id: conversationId,
            otherParticipant: adminUser.id,
            lastMessage: '',
          })
          await fetchMessages(conversationId)
          setAdminInfo(adminUser.data())
        }
      }
      setLoading(false)
    } catch (err) {
      console.error('Error finding admin user:', err)
      // If permission denied, use a hardcoded admin fallback or show error
      if (err.code === 'permission-denied') {
        console.warn('Permission denied accessing users collection. Please check Firestore rules.')
        // Set a default admin ID or skip auto-loading in modal
        if (isModal) {
          setLoading(false)
        }
      }
      setLoading(false)
    }
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      // Get all unique conversations for this user
      const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTime', 'desc'),
        limit(50)
      )
      const snapshot = await getDocs(q)
      const convos = []
      const seenIds = new Set()

      for (const doc of snapshot.docs) {
        const data = doc.data()
        const otherParticipant = data.participants.find(p => p !== user.uid)
        
        if (otherParticipant && !seenIds.has(otherParticipant)) {
          seenIds.add(otherParticipant)
          convos.push({
            id: data.conversationId || doc.id,
            otherParticipant,
            lastMessage: data.lastMessage,
            lastMessageTime: data.lastMessageTime,
          })
        }
      }

      setConversations(convos)
    } catch (err) {
      console.error('Error fetching conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async (conversationId) => {
    try {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const batch = writeBatch(db)
        let count = 0
        snapshot.docs.forEach((msgDoc) => {
          const data = msgDoc.data()
          const isUnread = data.isRead !== true
          const isNotMe = (data.sender || data.senderId) !== user.uid
          if (isUnread && isNotMe) {
            batch.update(msgDoc.ref, { isRead: true })
            count++
          }
        })
        if (count > 0) {
          await batch.commit()
          console.log(`Marked ${count} messages in conversation ${conversationId} as read`)
        }
      }
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  const fetchMessages = async (conversationId) => {
    try {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      )
      const snapshot = await getDocs(q)
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      
      setMessages(msgs)
      await markMessagesAsRead(conversationId)
    } catch (err) {
      console.error('Error fetching messages:', err)
      if (err.code === 'permission-denied') {
        console.warn('Permission denied accessing messages collection. Please check Firestore rules.')
      }
      setMessages([])
    }
  }

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation)
    await fetchMessages(conversation.id)
    // Fetch other participant's info
    try {
      const userDoc = await getDoc(doc(db, 'users', conversation.otherParticipant))
      if (userDoc.exists()) {
        setAdminInfo(userDoc.data())
      }
    } catch (err) {
      console.error('Error fetching user info:', err)
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return

    try {
      setSending(true)
      await addDoc(collection(db, 'messages'), {
        conversationId: selectedConversation.id,
        participants: [user.uid, selectedConversation.otherParticipant],
        sender: user.uid,
        senderName: user.displayName || user.email,
        content: messageText,
        timestamp: serverTimestamp(),
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        isRead: false,
      })

      setMessageText('')
      await fetchMessages(selectedConversation.id)
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleStartNewConversation = async () => {
    if (!adminId) return
    
    const conversationId = [user.uid, adminId].sort().join('_')
    
    // Check if conversation exists
    const existingConvo = conversations.find(c => c.otherParticipant === adminId)
    if (existingConvo) {
      handleSelectConversation(existingConvo)
      return
    }

    // Create new conversation
    try {
      setSelectedConversation({
        id: conversationId,
        otherParticipant: adminId,
        lastMessage: '',
      })
      setMessages([])
    } catch (err) {
      console.error('Error starting conversation:', err)
    }
  }

  if (loading) {
    return <div className={`messaging-page ${isModal ? 'messaging-modal' : ''}`}><p>Loading messages...</p></div>
  }

  return (
    <div className={`messaging-page ${isModal ? 'messaging-modal' : ''}`}>
      <div className="messaging-container">
        {isModal && onClose && ( 
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        )}
        
        {!selectedConversation && !isModal && (
          <div className="conversations-list">
            <div className="messaging-header">
              <h2>Your Conversations</h2>
              {userRole === 'user' && (
                <button className="btn-start-chat" onClick={handleStartNewConversation}>
                  Chat with Support
                </button>
              )}
            </div>
            {conversations.length === 0 ? (
              <div className="empty-conversations">
                <p>No conversations yet.</p>
              </div>
            ) : (
              <div className="conversations-grid">
                {conversations.map((convo) => (
                  <div 
                    key={convo.id} 
                    className="conversation-item"
                    onClick={() => handleSelectConversation(convo)}
                  >
                    <div className="convo-avatar">👤</div>
                    <div className="convo-info">
                      <h4>{convo.otherParticipant}</h4>
                      <p>{convo.lastMessage}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedConversation && (
          <div className="chat-window">
            <div className="chat-header">
              {!isModal && (
                <button className="btn-back" onClick={() => setSelectedConversation(null)}>
                  ← Back
                </button>
              )}
              <h3>{adminInfo?.displayName || selectedConversation?.otherParticipant || 'Seller'}</h3>
            </div>
            
            <div className="messages-list">
              {messages.length === 0 ? (
                <p className="no-messages">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.sender === user.uid ? 'sent' : 'received'}`}>
                    <p className="message-sender">{msg.senderName}</p>
                    <p className="message-content">{msg.content}</p>
                    {msg.timestamp && (
                      <span className="message-time">
                        {new Date(msg.timestamp.seconds * 1000).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))
              )}

            </div>
            <div className="message-input">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                disabled={sending}
              /> 

              <button className="btn-send" onClick={handleSendMessage} disabled={sending}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
