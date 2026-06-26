import { db } from './firebase.js';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
      const id = docSnap.id;
      
      let cursor = d.link ? 'pointer' : 'default';
      let linkClick = d.link ? `onclick="window.location.href='${d.link}'"` : '';
      
      list.innerHTML += `
        <div style="background: rgba(255,255,255,0.02); border-left: 2px solid var(--shn-pink); padding: 10px; border-radius: 8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <div style="flex:1; cursor:${cursor};" ${linkClick}>
            <p style="color: var(--txt); font-family: 'Space Mono'; font-size: 0.85rem; margin:0 0 5px 0;">${d.message}</p>
            <small style="color: var(--mut); font-size: 0.7rem;">${date}</small>
          </div>
          <button class="btn" style="background:var(--bad); color:#fff; border:none; border-radius:5px; padding:5px 10px; margin-left:10px;" onclick="window.deleteNotif('${id}')">🗑️ Sil</button>
        </div>
      `;
    });
  });
});

window.deleteNotif = async function(docId) {
  const uid = localStorage.getItem('uid');
  if(!uid) return;
  try {
    await deleteDoc(doc(db, `notifications/${uid}/user_notifications`, docId));
  } catch(e) {
    console.error("Silme hatası: ", e);
  }
};
