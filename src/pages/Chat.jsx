import React, { useState, useEffect, useRef } from 'react'
import { db } from '../services/firebase'
import { collection, query, where, addDoc, serverTimestamp, orderBy, onSnapshot, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import '../css/Messaging.css'

export function Chat() {
  const { user, userName, userRole } = useAuth()
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
        
        // If buyer, fetch sellers. If seller, fetch buyers
        const roleToFetch = userRole === 'seller' ? 'user' : 'seller'
        console.log('🔍 Fetching users with role:', roleToFetch)
        
        const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', roleToFetch)))
        const usersData = {}
        
        console.log('📊 Found', snapshot.docs.length, 'users with role', roleToFetch)
        
        snapshot.docs.forEach(doc => {
          usersData[doc.id] = {
            uid: doc.id,
            storeName: doc.data().storeName || doc.data().name || 'Store',
            name: doc.data().name || 'User',
            email: doc.data().email,
            storePhotoUrl: doc.data().storePhotoUrl || null
          }
          console.log('✅ Added user:', doc.id, usersData[doc.id])
        })
        
        console.log('📝 Final users map:', usersData)
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

  if (!user) return <div>Loading user...</div>
  
  if (!userRole) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading user role...</div>
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Users list - Stores for buyers, Customers for sellers */}
      <div style={{ width: '30%', borderRight: '1px solid #ddd', backgroundColor: '#fff', overflowY: 'auto' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ margin: 0 }}>
            {userRole === 'seller' ? 'Customers' : 'Stores'}
          </h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
            {userRole === 'seller' ? 'Your customer messages' : 'Message your favorite stores'}
          </p>
        </div>

        {loadingConversations && Object.keys(otherUsersMap).length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            ⏳ Loading {userRole === 'seller' ? 'customers' : 'stores'}...
          </div>
        ) : Object.keys(otherUsersMap).length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            <p>No {userRole === 'seller' ? 'customers' : 'stores'} available</p>
            <p style={{ fontSize: '11px', marginTop: '10px' }}>Make sure there are {userRole === 'seller' ? 'buyers' : 'sellers'} in the system</p>
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
                style={{
                  padding: '12px 15px',
                  cursor: 'pointer',
                  backgroundColor: selectedOtherId === otherUser.uid ? '#e3f2fd' : '#fff',
                  borderBottom: '1px solid #eee',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                {/* Store Photo Avatar */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: '#f0f0f0',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: selectedOtherId === otherUser.uid ? '2px solid #667eea' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {otherUser.storePhotoUrl ? (
                    <img 
                      src={otherUser.storePhotoUrl} 
                      alt={otherUser.storeName} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '24px' }}>
                      {userRole === 'seller' ? '👤' : '🏪'}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 600, color: '#333' }}>
                    {userRole === 'seller' ? otherUser.name : otherUser.storeName || 'Store'}
                  </p>
                  {userRole !== 'seller' && (
                    <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#666' }}>
                      {otherUser.name || 'Store Owner'}
                    </p>
                  )}
                  {conversation ? (
                    <p style={{ margin: 0, fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conversation.lastMessage}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '12px', color: '#ccc', fontStyle: 'italic' }}>
                      No messages yet
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Chat window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
        {selectedOtherId ? (
          <>
            <div style={{ padding: '15px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ margin: 0, color: '#333' }}>
                {userRole === 'seller' 
                  ? otherUsersMap[selectedOtherId]?.name || 'Customer'
                  : otherUsersMap[selectedOtherId]?.storeName || 'Store'
                }
              </h3>
              {userRole !== 'seller' && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                  {otherUsersMap[selectedOtherId]?.name || 'Store Owner'}
                </p>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', color: '#999' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', paddingTop: '20px' }}>
                  <p>No messages yet</p>
                  <p style={{ fontSize: '12px', marginTop: '10px' }}>Start the conversation below!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '10px',
                      textAlign: msg.senderId === user.uid ? 'right' : 'left'
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: msg.senderId === user.uid ? '#007bff' : '#e9ecef',
                        color: msg.senderId === user.uid ? '#fff' : '#333',
                        maxWidth: '70%',
                        wordWrap: 'break-word'
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, marginBottom: '4px', opacity: 0.8 }}>
                        {msg.senderName}
                      </p>
                      <p style={{ margin: 0 }}>{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: 'flex', padding: '15px', borderTop: '1px solid #ddd', gap: '10px' }}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              />
              <button
                onClick={() => {
                  console.log('Send button clicked!')
                  handleSendMessage()
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>
                Select a {userRole === 'seller' ? 'customer' : 'store'} to chat
              </p>
              <p style={{ fontSize: '14px' }}>Choose from your conversations on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}