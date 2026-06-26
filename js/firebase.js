import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB-iYgpqQYmgHf0FQnvh1LT3GJIwfJP4qE",
    authDomain: "muzikhan-dd347.firebaseapp.com",
    projectId: "muzikhan-dd347",
    storageBucket: "muzikhan-dd347.firebasestorage.app",
    messagingSenderId: "860422356275",
    appId: "1:860422356275:web:24dd18806481b0e6731246",
    measurementId: "G-B3XL5K98WL"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
