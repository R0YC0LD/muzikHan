import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
});

async function loadUsers() {
  const list = document.getElementById('user-list');
  if(!list) return;

  try {
    const snap = await getDocs(collection(db, "users"));
    list.innerHTML = '';
    snap.forEach(d => {
      const u = d.data();
      list.innerHTML += `
        <div style="background:var(--glass); padding:1rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="margin:0;">${u.name || 'İsimsiz'}</h4>
            <p style="margin:0; font-size:0.8rem;">${u.email}</p>
          </div>
          <select onchange="window.changeUserRole('${d.id}', this.value)">
            <option value="artist" ${u.role === 'artist' ? 'selected' : ''}>Sanatçı</option>
            <option value="crew" ${u.role === 'crew' ? 'selected' : ''}>Ekip Üyesi</option>
            <option value="producer" ${u.role === 'producer' ? 'selected' : ''}>Prodüktör</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Yönetici</option>
          </select>
        </div>
      `;
    });
  } catch(e) {
    list.innerHTML = `<p style="color:var(--bad)">Hata: ${e.message}. Sadece yöneticiler erişebilir.</p>`;
  }
}

window.changeUserRole = async function(uid, role) {
  try {
    await setDoc(doc(db, "users", uid), { role: role }, { merge: true });
    alert("Kullanıcı rolü başarıyla güncellendi.");
  } catch(e) {
    alert("Yetki Hatası: " + e.message);
  }
}
