import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyCtZLla971wTi36Mgfl5S1CslkgxaH0Gig",
  authDomain: "roadtrip2026-1a73c.firebaseapp.com",
  databaseURL: "https://roadtrip2026-1a73c-default-rtdb.firebaseio.com",
  projectId: "roadtrip2026-1a73c",
  storageBucket: "roadtrip2026-1a73c.firebasestorage.app",
  messagingSenderId: "112980226549",
  appId: "1:112980226549:web:f282b76f1467a62ff930bc"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
