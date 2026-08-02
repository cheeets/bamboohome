import React, { createContext, useState, useEffect, useContext } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, db } from '../services/firebase'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'

const AuthContext = createContext()

export const PINAMUNGAJAN_BARANGAYS = [
  'Anislag', 'Anopog', 'Binabag', 'Buhingtubig', 'Busay', 'Butong',
  'Cabiangon', 'Camugao', 'Duangan', 'Guimbawian', 'Lamac', 'Lut-od',
  'Mangoto', 'Opao', 'Pandacan', 'Poblacion', 'Punod', 'Rizal',
  'Sacsac', 'Sambagon', 'Sibago', 'Tajao', 'Tangub', 'Tanibag',
  'Tupas', 'Tutay',
]

export const CEBU_CITIES_AND_MUNICIPALITIES = [
  'Alcantara', 'Alcoy', 'Alegria', 'Aloguinsan', 'Argao', 'Asturias',
  'Badian', 'Balamban', 'Bantayan', 'Barili', 'Bogo City', 'Boljoon',
  'Borbon', 'Carcar City', 'Carmen', 'Catmon', 'Cebu City', 'Compostela',
  'Consolacion', 'Cordova', 'Daanbantayan', 'Dalaguete', 'Danao City',
  'Dumanjug', 'Ginatilan', 'Lapu-Lapu City', 'Liloan', 'Madridejos',
  'Malabuyoc', 'Mandaue City', 'Medellin', 'Minglanilla', 'Moalboal',
  'Naga City', 'Oslob', 'Pilar', 'Pinamungajan', 'Poro', 'Ronda',
  'Samboan', 'San Fernando', 'San Francisco', 'San Remigio', 'Santa Fe',
  'Santander', 'Sibonga', 'Sogod', 'Tabogon', 'Tabuelan', 'Talisay City',
  'Toledo City', 'Tuburan', 'Tudela',
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storePhotoUrl, setStorePhotoUrl] = useState('')
  const [isSuspended, setIsSuspended] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState('')
  const [suspensionEndAt, setSuspensionEndAt] = useState(null)
  const [loading, setLoading] = useState(true)

  const getSuspensionEndTime = (value) => {
    if (!value) return null

    if (typeof value?.toDate === 'function') {
      return value.toDate()
    }

    if (value instanceof Date) {
      return value
    }

    const parsedDate = new Date(value)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  // Check if suspension has expired and auto-unsuspend
  const checkAndAutoUnsuspend = async (userId, userData) => {
    if (userData?.isSuspended && userData?.suspensionEndAt) {
      const endTime = getSuspensionEndTime(userData.suspensionEndAt)
      const now = new Date()

      if (endTime && now >= endTime) {
        try {
          const userRef = doc(db, 'users', userId)
          await updateDoc(userRef, {
            isSuspended: false,
            suspensionReason: null,
            suspendedAt: null,
            suspensionEndAt: null,
            suspensionDuration: null,
            suspensionUnit: null,
            updatedAt: new Date(),
          })

          setIsSuspended(false)
          setSuspensionReason('')
          setSuspensionEndAt(null)

          // Send notification
          const notificationData = {
            userId,
            message: 'Your seller account has been automatically unsuspended.',
            type: 'order_update',
            isRead: false,
            createdAt: serverTimestamp(),
          }
          await setDoc(doc(db, 'notifications', `${userId}_auto_unsuspend_${Date.now()}`), notificationData)

          return true
        } catch (error) {
          console.error('Error auto-unsuspending user:', error)
        }
      }
    }
    return false
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser)

          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const data = userDocSnap.data()

            // If the user has been soft-deleted, immediately sign them out and do not set app state
            if (data.deleted) {
              console.warn('User account is marked deleted in Firestore — signing out:', currentUser.uid)
              await signOut(auth)
              setUser(null)
              setUserRole(null)
              setUserName('')
              setStoreName('')
              setStorePhotoUrl('')
              setIsSuspended(false)
              setSuspensionReason('')
              setSuspensionEndAt(null)
              setLoading(false)
              return
            }
            
            // Check if suspension has expired
            const wasAutoUnsuspended = await checkAndAutoUnsuspend(currentUser.uid, data)
            
            if (!wasAutoUnsuspended) {
              setUserRole(data.role?.toLowerCase() || 'user')
              setUserName(data.name || data.displayName || '')
              setStoreName(data.storeName || '')
              setStorePhotoUrl(data.storePhotoUrl || '')
              setIsSuspended(data.isSuspended || false)
              setSuspensionReason(data.suspensionReason || '')
              setSuspensionEndAt(data.suspensionEndAt || null)
            }
          }
        } else {
          setUser(null)
          setUserRole(null)
          setUserName('')
          setStoreName('')
          setStorePhotoUrl('')
          setIsSuspended(false)
          setSuspensionReason('')
          setSuspensionEndAt(null)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  // Keep checking the suspension deadline so the account is unsuspended as soon as it expires.
  useEffect(() => {
    if (!user || !isSuspended || !suspensionEndAt) return

    const checkInterval = setInterval(async () => {
      const userDocRef = doc(db, 'users', user.uid)
      const userDocSnap = await getDoc(userDocRef)
      if (userDocSnap.exists()) {
        await checkAndAutoUnsuspend(user.uid, userDocSnap.data())
      }
    }, 1000)

    return () => clearInterval(checkInterval)
  }, [user, isSuspended, suspensionEndAt])

  // ✅ UPDATED REGISTER FUNCTION
  const register = async (
    email,
    password,
    name,
    role = 'user',
    sellerStoreName = '',
    sellerStorePhotoUrl = '',
    municipality = '',
    barangay = '',
    sellerPhoneNumber = '',
  ) => {
    try {
      // Normalize values
      const normalizedRole = role === 'admin' ? 'admin' : role === 'seller' ? 'seller' : 'user'
      const normalizedName = name?.trim() || ''
      const normalizedMunicipality = municipality?.trim() || ''
      const normalizedBarangay = barangay?.trim() || ''
      const normalizedSellerPhoneNumber = sellerPhoneNumber?.trim() || ''

      if (!normalizedName) {
        throw new Error('Name is required.')
      }

      if (normalizedRole === 'seller' && !sellerStoreName?.trim()) {
        throw new Error('Store name is required for sellers.')
      }

      if (normalizedRole === 'seller' && !sellerStorePhotoUrl?.trim()) {
        throw new Error('Store photo is required for sellers.')
      }

      if (normalizedRole === 'seller' && !/^(?:09\d{9}|\+639\d{9})$/.test(normalizedSellerPhoneNumber)) {
        throw new Error('A valid seller contact number is required.')
      }

      // Only enforce municipality/barangay for non-seller registrations
      if (normalizedRole !== 'seller') {
        if (normalizedMunicipality !== 'Pinamungajan') {
          throw new Error('bamboo home is currently not available in your province or city')
        }

        if (!PINAMUNGAJAN_BARANGAYS.includes(normalizedBarangay)) {
          throw new Error('Please select Pinamungajan and a valid barangay to register.')
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const newUser = userCredential.user

      // Save user in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        name: normalizedName,
        email,
        role: normalizedRole,
        storeName: normalizedRole === 'seller' ? sellerStoreName.trim() : null,
        storePhotoUrl: normalizedRole === 'seller' ? sellerStorePhotoUrl : null,
        contactNumber: normalizedRole === 'seller' ? normalizedSellerPhoneNumber : null,
        municipality: normalizedMunicipality,
        barangay: normalizedBarangay,
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
      
        // Prevent login if account is soft-deleted
        if (data.deleted) {
          console.warn('Attempted login to deleted account:', currentUser.uid)
          // Sign out the firebase auth session that was just created and return an error to caller
          await signOut(auth)
          const err = new Error('This account has been deleted. If you believe this is an error, contact support.')
          err.code = 'auth/account-deleted'
          throw err
        }
      
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
    isSuspended,
    suspensionReason,
    suspensionEndAt,
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
