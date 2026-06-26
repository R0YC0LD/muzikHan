import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
});

async function loadUsers() {
  const list = document.getElementById('user-list');
  const pendingList = document.getElementById('pending-users-list');
  if(!list) return;

  try {
    const snap = await getDocs(collection(db, "users"));
    list.innerHTML = '';
    if(pendingList) pendingList.innerHTML = '';
    
    let pendingCount = 0;

    snap.forEach(d => {
      const u = d.data();
      const id = d.id;
      
      // Admin her zaman onaylı sayılır
      const isApproved = u.isApproved === true || u.role === 'admin';

      if (!isApproved && pendingList) {
        pendingCount++;
        pendingList.innerHTML += `
          <div style="background:var(--glass); padding:1rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-left: 4px solid var(--shn-pink);">
            <div style="display:flex; align-items:center; gap:15px;">
              <div id="adm-av-p-${id}"></div>
              <div>
                <h4 style="margin:0;">${u.name || 'İsimsiz'}</h4>
                <p style="margin:0; font-size:0.8rem;">${u.email}</p>
              </div>
            </div>
            <button class="btn btn-primary" onclick="window.approveUser('${id}')">Erişim Ver</button>
          </div>
        `;
        window.getUserAvatar(id).then(url => {
          const el = document.getElementById(`adm-av-p-${id}`);
          if(el) el.innerHTML = window.renderAvatarHtml(url, 40, u.name || 'User');
        });
      } else {
        list.innerHTML += `
          <div style="background:var(--glass); padding:1rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:15px;">
              <div id="adm-av-${id}"></div>
              <div>
                <h4 style="margin:0;">${u.name || 'İsimsiz'}</h4>
                <p style="margin:0; font-size:0.8rem;">${u.email}</p>
              </div>
            </div>
            <select onchange="window.changeUserRole('${id}', this.value)">
              <option value="artist" ${u.role === 'artist' ? 'selected' : ''}>Sanatçı</option>
              <option value="producer" ${u.role === 'producer' ? 'selected' : ''}>Prodüktör</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Yönetici</option>
            </select>
          </div>
        `;
        window.getUserAvatar(id).then(url => {
          const el = document.getElementById(`adm-av-${id}`);
          if(el) el.innerHTML = window.renderAvatarHtml(url, 40, u.name || 'User');
        });
      }
    });

    if (pendingCount === 0 && pendingList) {
      pendingList.innerHTML = '<p style="font-size: 0.8rem; color: var(--mut);">Şu anda onay bekleyen kullanıcı yok.</p>';
    }

  } catch(e) {
    list.innerHTML = `<p style="color:var(--bad)">Hata: ${e.message}. Sadece yöneticiler erişebilir.</p>`;
    if(pendingList) pendingList.innerHTML = `<p style="color:var(--bad)">Hata: Yüklenemedi.</p>`;
  }
}

window.approveUser = async function(uid) {
  try {
    await setDoc(doc(db, "users", uid), { isApproved: true }, { merge: true });
    alert("Kullanıcıya sisteme erişim izni verildi.");
    loadUsers(); // Listeyi yenile
  } catch(e) {
    alert("Yetki Hatası: " + e.message);
  }
}

window.changeUserRole = async function(uid, role) {
  try {
    // Admin yapılırken isApproved otomatik true olsun
    const data = role === 'admin' ? { role: role, isApproved: true } : { role: role };
    await setDoc(doc(db, "users", uid), data, { merge: true });
    alert("Kullanıcı rolü başarıyla güncellendi.");
  } catch(e) {
    alert("Yetki Hatası: " + e.message);
  }
}
