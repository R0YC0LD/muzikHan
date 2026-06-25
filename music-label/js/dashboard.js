import { db } from './firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  // Give auth a moment to load
  setTimeout(loadStats, 1000);
});

async function loadStats() {
  const role = localStorage.getItem('userRole');
  if(role !== 'admin' && role !== 'crew') return;

  try {
    const demosSnap = await getDocs(collection(db, "demos"));
    const relSnap = await getDocs(query(collection(db, "releases"), where("status", "==", "bekliyor")));
    
    // Update DOM (varsayılan statik kartlar yerine)
    const cards = document.querySelectorAll('.stat-card h3');
    if(cards.length >= 2) {
      cards[0].innerText = demosSnap.size;
      cards[1].innerText = relSnap.size;
    }
  } catch(e) {
    console.error("Dashboard Stats Error:", e);
  }
}
