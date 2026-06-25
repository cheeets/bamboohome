import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, query, where, addDoc, serverTimestamp, orderBy, onSnapshot, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
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
  const messagesEndRef = useRef(null)
  const messagesUnsubscribeRef = useRef(null)
  const conversationsUnsubscribeRef = useRef(null)

  // Handle incoming sellerId from navigation state
  useEffect(() => {
    if (location.state?.sellerId) {
      console.log('📬 Navigated to chat with seller:', location.state.sellerId)
      setSelectedOtherId(location.state.sellerId)
    }
  }, [location.state])

  // Mark all messages as read when page opens
  useEffect(() => {
    if (user) {
      markAllMessagesAsRead()
    }
  }, [user])

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
          const isNotMe = (data.senderId || data.sender) !== user.uid
          if (isUnread && isNotMe) {
            batch.update(msgDoc.ref, { isRead: true })
            count++
          }
        })
        if (count > 0) {
          await batch.commit()
          console.log(`Marked ${count} messages as read globally`)
        }
      }
    } catch (err) {
      console.error('Error marking all messages as read:', err)
    }
  }

  const markMessagesAsRead = async (otherId) => {
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
          const participants = data.participants || []
          const isRelevant = participants.includes(otherId)
          const isUnread = data.isRead !== true
          const isNotMe = (data.senderId || data.sender) !== user.uid
          
          if (isRelevant && isUnread && isNotMe) {
            batch.update(msgDoc.ref, { isRead: true })
            count++
          }
        })
        if (count > 0) {
          await batch.commit()
          console.log(`Marked ${count} messages with ${otherId} as read`)
        }
      }
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  // Load other users based on role (sellers for buyers, buyers for sellers)
  useEffect(() => {
    const fetchOtherUsers = async () => {
      try {
        console.log('=== FETCHING OTHER USERS ===')
        console.log('User logged in:', user?.uid)
        console.log('User role:', userRole)
        
        if (!userRole) {
          console.log('⏳ Waiting for user role...')
          return
        }
        
        // If buyer, fetch only sellers with existing conversations
        const roleToFetch = userRole === 'seller' ? 'user' : 'seller'
        console.log('🔍 Fetching users with role:', roleToFetch)
        
        // First get the participants from messages to know who we've talked to
        const msgQuery = query(
          collection(db, 'messages'),
          where('participants', 'array-contains', user.uid)
        )
        const msgSnapshot = await getDocs(msgQuery)
        const participantIds = new Set()
        msgSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const other = data.participants.find(p => p !== user.uid)
          if (other) participantIds.add(other)
        })

        // If we were navigated here with a specific sellerId, add it to the set
        if (location.state?.sellerId) {
          participantIds.add(location.state.sellerId)
        }

        const usersData = {}
        
        if (participantIds.size > 0) {
          // Firestore 'in' query is limited to 10 items, but we'll fetch them individually or use chunks if needed.
          // For simplicity and since it's likely a small number of active chats:
          for (const otherId of participantIds) {
            const userDoc = await getDoc(doc(db, 'users', otherId))
            if (userDoc.exists() && userDoc.data().role === roleToFetch) {
              usersData[otherId] = {
                uid: otherId,
                storeName: userDoc.data().storeName || userDoc.data().name || 'Store',
                name: userDoc.data().name || 'User',
                email: userDoc.data().email,
                storePhotoUrl: userDoc.data().storePhotoUrl || null
              }
            }
          }
        }
        
        console.log('📝 Final restricted users map:', usersData)
        setOtherUsersMap(usersData)
        setLoadingConversations(false)
      } catch (err) {
        console.error('❌ Error fetching other users:', err)
        setLoadingConversations(false)
      }
    }
    
    if (user && userRole) {
      fetchOtherUsers()
    }
  }, [user, userRole])

  // Load conversations (messages with other users)
  useEffect(() => {
    if (!user || Object.keys(otherUsersMap).length === 0) return

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    )

    conversationsUnsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const map = new Map()

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const otherUserId = data.participants.find(p => p !== user.uid)

        // Only include if the other user exists in our otherUsersMap
        if (otherUserId && otherUsersMap[otherUserId] && !map.has(otherUserId)) {
          map.set(otherUserId, {
            userId: otherUserId,
            lastMessage: data.message,
            senderName: data.senderName,
            createdAt: data.createdAt
          })
        }
      })

      setConversations(Array.from(map.values()))
      setLoadingConversations(false)
    }, (err) => {
      console.error('Error loading conversations:', err)
      setLoadingConversations(false)
    })

    return () => {
      if (conversationsUnsubscribeRef.current) {
        conversationsUnsubscribeRef.current()
      }
    }
  }, [user, otherUsersMap])

  // Setup real-time listener for messages with selected user
  const setupMessagesListener = (otherId) => {
    if (!user || !otherId) return

    setLoadingMessages(true)
    try {
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
            return participants.includes(user.uid) && participants.includes(otherId)
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

  // Load messages when selected user changes
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

  // Auto-scroll to latest message
  useEffect(() => {
    if (!messagesEndRef.current) return
    const raf = requestAnimationFrame(() => {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      } catch (e) {
        messagesEndRef.current.scrollIntoView()
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [messages])

  const handleSendMessage = async () => {
    console.log('=== SEND MESSAGE DEBUG ===')
    console.log('messageInput:', messageInput.trim())
    console.log('selectedOtherId:', selectedOtherId)
    console.log('user.uid:', user?.uid)
    
    if (!messageInput.trim()) {
      console.log('❌ Message is empty')
      return
    }
    
    if (!selectedOtherId) {
      console.log('❌ No user selected')
      return
    }
    
    if (!user) {
      console.log('❌ No user logged in')
      return
    }

    try {
      const participants = [user.uid, selectedOtherId]
      console.log('📤 Sending with participants:', participants)

      const docRef = await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: userName || user.email || 'User',
        receiverId: selectedOtherId,
        participants,
        message: messageInput.trim(),
        createdAt: serverTimestamp(),
        isRead: false
      })

      console.log('✅ Message sent successfully! ID:', docRef.id)
      setMessageInput('')
    } catch (err) {
      console.error('❌ Error sending message:', err)
      alert('Error sending message: ' + err.message)
    }
  }

  if (!user) return <div className="chat-loading">Loading user...</div>
  
  if (!userRole) {
    return <div className="chat-loading">Loading user role...</div>
  }

  return (
    <div className="chat-shell">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>
            {userRole === 'seller' ? 'Customers' : 'Stores'}
          </h3>
          <p>
            {userRole === 'seller' ? 'Your customer messages' : 'Message your favorite stores'}
          </p>
        </div>

        {loadingConversations && Object.keys(otherUsersMap).length === 0 ? (
          <div className="chat-empty">
            Loading {userRole === 'seller' ? 'customers' : 'stores'}...
          </div>
        ) : Object.keys(otherUsersMap).length === 0 ? (
          <div className="chat-empty">
            <p>No {userRole === 'seller' ? 'customers' : 'stores'} available</p>
            <p className="chat-empty-note">Make sure there are {userRole === 'seller' ? 'buyers' : 'sellers'} in the system</p>
          </div>
        ) : (
          Object.values(otherUsersMap).map((otherUser) => {
            const conversation = conversations.find(c => c.userId === otherUser.uid)
            return (
              <div
                key={otherUser.uid}
                onClick={() => {
                  console.log('Selected user:', otherUser.uid)
                  setSelectedOtherId(otherUser.uid)
                }}
                className={`chat-user-item ${selectedOtherId === otherUser.uid ? 'active' : ''}`}
              >
                <div className="chat-user-avatar">
                  {otherUser.storePhotoUrl ? (
                    <img 
                      src={otherUser.storePhotoUrl} 
                      alt={otherUser.storeName} 
                      className="chat-user-avatar-image"
                    />
                  ) : (
                    <span>{userRole === 'seller' ? 'U' : 'S'}</span>
                  )}
                </div>

                <div className="chat-user-meta">
                  <p className="chat-user-name">
                    {userRole === 'seller' ? otherUser.name : otherUser.storeName || 'Store'}
                  </p>
                  {userRole !== 'seller' && (
                    <p className="chat-user-subname">
                      {otherUser.name || 'Store Owner'}
                    </p>
                  )}
                  {conversation ? (
                    <p className="chat-user-preview">
                      {conversation.lastMessage}
                    </p>
                  ) : (
                    <p className="chat-user-preview empty">
                      No messages yet
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </aside>

      <section className="chat-main">
        {selectedOtherId ? (
          <>
            <div className="chat-main-header">
              <h3>
                {userRole === 'seller' 
                  ? otherUsersMap[selectedOtherId]?.name || 'Customer'
                  : otherUsersMap[selectedOtherId]?.storeName || 'Store'
                }
              </h3>
              {userRole !== 'seller' && (
                <p>
                  {otherUsersMap[selectedOtherId]?.name || 'Store Owner'}
                </p>
              )}
            </div>

            <div className="chat-messages">
              {loadingMessages ? (
                <div className="chat-empty">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="chat-empty">
                  <p>No messages yet</p>
                  <p className="chat-empty-note">Start the conversation below.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message-row ${msg.senderId === user.uid ? 'sent' : 'received'}`}
                  >
                    <div
                      className={`chat-bubble ${msg.senderId === user.uid ? 'sent' : 'received'}`}
                    >
                      <p className="chat-bubble-sender">
                        {msg.senderName}
                      </p>
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
              <button
                onClick={() => {
                  console.log('Send button clicked!')
                  handleSendMessage()
                }}
                className="chat-send-btn"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="chat-empty chat-empty-main">
            <div>
              <p className="chat-empty-title">
                Select a {userRole === 'seller' ? 'customer' : 'store'} to chat
              </p>
              <p className="chat-empty-note">Choose from your conversations on the left</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}