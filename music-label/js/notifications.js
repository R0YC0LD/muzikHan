import { db } from './firebase.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const uid = localStorage.getItem('uid');
  if(!uid) return;

  const q = query(collection(db, `notifications/${uid}/user_notifications`), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
    const list = document.getElementById('notifications-list');
    if(!list) return;

    list.innerHTML = '';
    
    if(snapshot.empty) {
      list.innerHTML = '<p class="text-mut">Henüz hiç bildiriminiz yok.</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString() : 'Şimdi';
      
      list.innerHTML += `
        <div style="background: rgba(255,255,255,0.02); border-left: 2px solid var(--shn-pink); padding: 1rem; border-radius: 8px;">
          <p style="color: var(--txt); font-family: 'Space Mono'; font-size: 0.85rem;">${d.message}</p>
          <small style="color: var(--mut); font-size: 0.7rem;">${date}</small>
        </div>
      `;
    });
  });
});
