import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBAEFpdzpoB2vtvhSDOZaGuSn24TCZjmsI",
  authDomain: "ceso-istanbul.firebaseapp.com",
  projectId: "ceso-istanbul",
  storageBucket: "ceso-istanbul.firebasestorage.app",
  messagingSenderId: "30392774343",
  appId: "1:30392774343:web:8baffdf90c6e97404858e2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
