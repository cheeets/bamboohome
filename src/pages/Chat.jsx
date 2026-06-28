import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, query, where, addDoc, serverTimestamp, orderBy, onSnapshot, getDocs, getDoc, doc, writeBatch } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { Menu } from 'lucide-react'
import '../css/Messaging.css'

export function Chat() {
  const { user, userName, userRole } = useAuth()
  const location = useLocation()
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [selectedOtherId, setSelectedOtherId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [otherUsersMap, setOtherUsersMap] = useState({})
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesUnsubscribeRef = useRef(null)

  // Load a single user
  const fetchSingleUser = async (otherId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', otherId))
      if (userDoc.exists()) {
        return {
          uid: otherId,
          storeName: userDoc.data().storeName || userDoc.data().name || 'Store',
          name: userDoc.data().name || 'User',
          email: userDoc.data().email,
          storePhotoUrl: userDoc.data().storePhotoUrl || null,
          role: userDoc.data().role
        }
      }
      return null
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  // Load all relevant users
  useEffect(() => {
    const loadUsers = async () => {
      if (!user || !userRole) return
      setLoadingConversations(true)

      // First, get all participants we have existing chats with
      const participantIds = new Set()
      try {
        const msgQuery = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid))
        const msgSnapshot = await getDocs(msgQuery)
        msgSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const other = data.participants.find(p => p !== user.uid)
          if (other) participantIds.add(other)
        })
      } catch (error) {
        console.error('Error fetching messages:', error)
      }

      // Add the seller from navigation state if present
      if (location.state?.sellerId) {
        participantIds.add(location.state.sellerId)
      }

      const usersData = {}
      console.log('Participant IDs:', Array.from(participantIds))

      for (const otherId of participantIds) {
        const userData = await fetchSingleUser(otherId)
        if (userData) {
          // Only add if correct role
          if (userRole === 'seller' && userData.role === 'user') {
            usersData[otherId] = userData
          } else if (userRole !== 'seller' && userData.role === 'seller') {
            usersData[otherId] = userData
          }
        }
      }

      console.log('📝 Final restricted users map:', usersData)
      setOtherUsersMap(usersData)
      setLoadingConversations(false)

      // If we have a sellerId from nav and we just fetched it, select it
      if (location.state?.sellerId && usersData[location.state.sellerId]) {
        setSelectedOtherId(location.state.sellerId)
      }
    }
    loadUsers()
  }, [user, userRole, location.state?.sellerId])

  // Load conversations
  useEffect(() => {
    if (!user || Object.keys(otherUsersMap).length === 0) return
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convMap = new Map()
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const otherUserId = data.participants.find(p => p !== user.uid)
        if (otherUserId && otherUsersMap[otherUserId] && !convMap.has(otherUserId)) {
          convMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: data.message,
            senderName: data.senderName,
            createdAt: data.createdAt
          })
        }
      })
      setConversations(Array.from(convMap.values()))
    })
    return () => unsubscribe()
  }, [user, otherUsersMap])

  // Setup messages listener
  const setupMessagesListener = (otherId) => {
    if (!user || !otherId) return
    setLoadingMessages(true)

    const q = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid), orderBy('createdAt', 'asc'))
    if (messagesUnsubscribeRef.current) {
      messagesUnsubscribeRef.current()
    }
    messagesUnsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const userMessages = snapshot.docs.filter(doc => {
        const data = doc.data()
        return data.participants.includes(user.uid) && data.participants.includes(otherId)
      }).map(doc => ({ id: doc.id, ...doc.data() }))
      setMessages(userMessages)
      setLoadingMessages(false)
    }, () => setLoadingMessages(false))
  }

  // When selected user changes
  useEffect(() => {
    if (selectedOtherId) {
      setupMessagesListener(selectedOtherId)
      markMessagesAsRead(selectedOtherId)
    } else {
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current()
      }
      setMessages([])
    }
    return () => {
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current()
      }
    }
  }, [selectedOtherId, user])

  // Mark messages as read
  const markMessagesAsRead = async (otherId) => {
    try {
      const q = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', user.uid)
      )
      const snapshot = await getDocs(q)
      const batch = writeBatch(db)
      let count = 0
      snapshot.docs.forEach(msgDoc => {
        const data = msgDoc.data()
        if (data.participants.includes(otherId) && !data.isRead && (data.senderId || data.sender) !== user.uid) {
          batch.update(msgDoc.ref, { isRead: true })
          count++
        }
      })
      if (count > 0) await batch.commit()
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedOtherId || !user) return
    try {
      const participants = [user.uid, selectedOtherId]
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: userName || user.email || 'User',
        receiverId: selectedOtherId,
        participants,
        message: messageInput.trim(),
        createdAt: serverTimestamp(),
        isRead: false
      })
      setMessageInput('')
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectUser = (otherId) => {
    setSelectedOtherId(otherId)
    setMobileMenuOpen(false)
  }

  if (!user) return <div className="chat-loading">Loading user...</div>
  if (!userRole) return <div className="chat-loading">Loading user role...</div>

  return (
    <div className="chat-shell">
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      <aside className={`chat-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-header-content">
            <h3>{userRole === 'seller' ? 'Customers' : 'Stores'}</h3>
            <p>{userRole === 'seller' ? 'Your customer messages' : 'Message your favorite stores'}</p>
          </div>
        </div>
        {loadingConversations ? (
          <div className="chat-empty">Loading {userRole === 'seller' ? 'customers' : 'stores'}...</div>
        ) : Object.keys(otherUsersMap).length === 0 ? (
          <div className="chat-empty">
            <p>No {userRole === 'seller' ? 'customers' : 'stores'} available</p>
            <p className="chat-empty-note">Make sure there are {userRole === 'seller' ? 'buyers' : 'sellers'} in the system</p>
          </div>
        ) : (
          Object.values(otherUsersMap).map(otherUser => {
            const conv = conversations.find(c => c.userId === otherUser.uid)
            return (
              <div
                key={otherUser.uid}
                className={`chat-user-item ${selectedOtherId === otherUser.uid ? 'active' : ''}`}
                onClick={() => handleSelectUser(otherUser.uid)}
              >
                <div className="chat-user-avatar">
                  {otherUser.storePhotoUrl ? (
                    <img src={otherUser.storePhotoUrl} alt={otherUser.storeName} className="chat-user-avatar-image" />
                  ) : (
                    <span>{userRole === 'seller' ? otherUser.name.charAt(0) : otherUser.storeName.charAt(0)}</span>
                  )}
                </div>
                <div className="chat-user-meta">
                  <p className="chat-user-name">
                    {userRole === 'seller' ? otherUser.name : otherUser.storeName}
                  </p>
                  {userRole !== 'seller' && <p className="chat-user-subname">{otherUser.name}</p>}
                  {conv ? <p className="chat-user-preview">{conv.lastMessage}</p> : <p className="chat-user-preview empty">No messages yet</p>}
                </div>
              </div>
            )
          })
        )}
      </aside>
      <section className="chat-main">
        {selectedOtherId && otherUsersMap[selectedOtherId] ? (
          <>
            <div className="chat-main-header">
              <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <div>
                <h3>{userRole === 'seller' ? otherUsersMap[selectedOtherId].name : otherUsersMap[selectedOtherId].storeName}</h3>
                {userRole !== 'seller' && <p>{otherUsersMap[selectedOtherId].name}</p>}
              </div>
            </div>
            <div className="chat-messages">
              {loadingMessages ? <div className="chat-empty">Loading messages...</div> : messages.length === 0 ? (
                <div className="chat-empty">
                  <p>No messages yet</p>
                  <p className="chat-empty-note">Start the conversation below</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`chat-message-row ${msg.senderId === user.uid ? 'sent' : 'received'}`}
                  >
                    <div className={`chat-bubble ${msg.senderId === user.uid ? 'sent' : 'received'}`}>
                      <p className="chat-bubble-sender">{msg.senderName}</p>
                      <p className="chat-bubble-text">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-bar">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="chat-input"
              />
              <button onClick={handleSendMessage} className="chat-send-btn">Send</button>
            </div>
          </>
        ) : (
          <>
            <div className="chat-main-header">
              <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
            </div>
            <div className="chat-empty chat-empty-main">
              <div>
                <p className="chat-empty-title">Select a {userRole === 'seller' ? 'customer' : 'store'} to chat</p>
                <p className="chat-empty-note">Choose from your conversations on the left</p>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
