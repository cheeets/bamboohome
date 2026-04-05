import React, { createContext, useState, useEffect, useContext } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, db } from '../services/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storePhotoUrl, setStorePhotoUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser)

          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const data = userDocSnap.data()
            setUserRole(data.role?.toLowerCase() || 'user')
            setUserName(data.name || data.displayName || '')
            setStoreName(data.storeName || '')
            setStorePhotoUrl(data.storePhotoUrl || '')
          }
        } else {
          setUser(null)
          setUserRole(null)
          setUserName('')
          setStoreName('')
          setStorePhotoUrl('')
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  // ✅ UPDATED REGISTER FUNCTION
  const register = async (email, password, name, role = 'user', sellerStoreName = '', sellerStorePhotoUrl = '') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const newUser = userCredential.user

      // Normalize values
      const normalizedRole = role === 'admin' ? 'admin' : role === 'seller' ? 'seller' : 'user'
      const normalizedName = name?.trim() || ''

      if (!normalizedName) {
        throw new Error('Name is required.')
      }

      if (normalizedRole === 'seller' && !sellerStoreName?.trim()) {
        throw new Error('Store name is required for sellers.')
      }

      if (normalizedRole === 'seller' && !sellerStorePhotoUrl?.trim()) {
        throw new Error('Store photo is required for sellers.')
      }

      // Save user in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        name: normalizedName,
        email,
        role: normalizedRole,
        storeName: normalizedRole === 'seller' ? sellerStoreName.trim() : null,
        storePhotoUrl: normalizedRole === 'seller' ? sellerStorePhotoUrl : null,
        createdAt: serverTimestamp(),
      })

      console.log('User document created successfully:', newUser.uid)

      // Update local state
      setUser(newUser)
      setUserRole(normalizedRole)
      setUserName(normalizedName)
      setStoreName(normalizedRole === 'seller' ? sellerStoreName.trim() : '')
      setStorePhotoUrl(normalizedRole === 'seller' ? sellerStorePhotoUrl : '')

      return newUser
    } catch (error) {
      console.error('Registration error:', error)
      const err = new Error(error.message)
      err.code = error.code
      throw err
    }
  }

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const currentUser = userCredential.user

      const userDocRef = doc(db, 'users', currentUser.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const data = userDocSnap.data()
        console.log('✓ Firestore User Data:', JSON.stringify(data))
        
        if (!data.role) {
          console.error('❌ WARNING: User document has NO role field!', data)
        }
        
        const userRole = data.role?.toLowerCase() || 'user'
        console.log('✓ User role:', userRole)
        
        setUser(currentUser)
        setUserRole(userRole)
        setUserName(data.name || data.displayName || '')
        setStoreName(data.storeName || '')
        setStorePhotoUrl(data.storePhotoUrl || '')
        
        // Return user and role for immediate use in components
        return { user: currentUser, role: userRole }
      } else {
        console.error('❌ User document not found in Firestore:', currentUser.uid)
        // Default to user role if document doesn't exist
        setUser(currentUser)
        setUserRole('user')
        setUserName(currentUser.email || '')
        return { user: currentUser, role: 'user' }
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      const err = new Error(error.message)
      err.code = error.code
      throw err
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setUserRole(null)
      setUserName('')
      setStoreName('')
      setStorePhotoUrl('')
    } catch (error) {
      throw new Error(error.message)
    }
  }

  const value = {
    user,
    userRole,
    userName,
    storeName,
    storePhotoUrl,
    loading,
    authLoading: loading,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}