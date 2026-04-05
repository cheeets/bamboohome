import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
   apiKey: "AIzaSyCFd5ppm-1c-mcTlbWPAobzIkY0BNv34p0",
  authDomain: "greennest-7e7bc.firebaseapp.com",
  projectId: "greennest-7e7bc",
  storageBucket: "greennest-7e7bc.firebasestorage.app",
  messagingSenderId: "84219699619",
  appId: "1:84219699619:web:9c08bc9a24fa45b80fba16",
  measurementId: "G-1178JYLDGL"
};

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
