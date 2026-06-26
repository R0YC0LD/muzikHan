import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, addDoc, serverTimestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from './auth.js';

let allUsersCache = [];

document.addEventListener('DOMContentLoaded', () => {
  // Firestore "users" listesi isSignedIn() gerektiriyor; auth durumu henüz
  // çözülmeden getDocs çağrılırsa permission-denied alınır ve liste boş kalır.
  // Bu yüzden onAuthStateChanged ile auth hazır olana kadar bekliyoruz.
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadUsers();
      loadActivityLog();
    }
  });

  const sendBtn = document.getElementById('btn-send-task');
  if (sendBtn) sendBtn.addEventListener('click', sendProducerTask);

  const searchInput = document.getElementById('user-search-input');
  if (searchInput) searchInput.addEventListener('input', (e) => renderUserSearchResults(e.target.value.trim()));
});

async function loadUsers() {
  const pendingList = document.getElementById('pending-users-list');

  try {
    const snap = await getDocs(collection(db, "users"));
    if(pendingList) pendingList.innerHTML = '';
    allUsersCache = [];

    let pendingCount = 0;

    snap.forEach(d => {
      const u = d.data();
      const id = d.id;
      allUsersCache.push({ id, ...u });

      // Admin her zaman onaylı sayılır
      const isApproved = u.isApproved === true || u.role === 'admin';

      if (!isApproved && pendingList) {
        pendingCount++;
        pendingList.innerHTML += `
          <div style="background:var(--glass); padding:1rem; border-radius:8px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; border-left: 4px solid var(--shn-pink);">
            <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
              <div id="adm-av-p-${id}" style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${id}'"></div>
              <div style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${id}'">
                <h4 style="margin:0;">${u.name || 'İsimsiz'}</h4>
                <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:0.65rem;" onclick="event.stopPropagation(); this.nextElementSibling.classList.remove('hidden'); this.classList.add('hidden')">Maili Göster</button>
                <span class="hidden" style="font-size:0.8rem; color:var(--mut);">${u.email}</span>
              </div>
            </div>
            <button class="btn btn-primary" onclick="window.approveUser('${id}', '${(u.name || u.email || '').replace(/'/g, "\\'")}')">Erişim Ver</button>
          </div>
        `;
        window.getUserAvatar(id).then(url => {
          const el = document.getElementById(`adm-av-p-${id}`);
          if(el) el.innerHTML = window.renderAvatarHtml(url, 40, u.name || 'User');
        });
      }
    });

    if (pendingCount === 0 && pendingList) {
      pendingList.innerHTML = '<p style="font-size: 0.8rem; color: var(--mut);">Şu anda onay bekleyen kullanıcı yok.</p>';
    }

    loadTaskAssignTargets();
  } catch(e) {
    if(pendingList) pendingList.innerHTML = `<p style="color:var(--bad)">Hata: Yüklenemedi.</p>`;
  }
}

// Kullanıcı Yönetimi: tüm kullanıcıları her zaman listelemek yerine isim/email aratıp
// sadece eşleşenleri kompakt bir satırda gösteriyoruz (çok kullanıcıda kart yığını oluşmasın).
function renderUserSearchResults(qStr) {
  const results = document.getElementById('user-search-results');
  if (!results) return;

  if (!qStr) { results.innerHTML = ''; return; }

  const q = qStr.toLowerCase();
  const matches = allUsersCache.filter(u =>
    (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  ).slice(0, 8);

  if (matches.length === 0) {
    results.innerHTML = '<p style="font-size:0.8rem; color:var(--mut);">Kullanıcı bulunamadı.</p>';
    return;
  }

  results.innerHTML = matches.map(u => `
    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px; background:var(--glass); padding:0.6rem 0.8rem; border-radius:8px;">
      <div id="usr-av-${u.id}" style="cursor:pointer;" onclick="window.location.href='profile.html?uid=${u.id}'"></div>
      <span style="flex:1; min-width:0; font-size:0.85rem; cursor:pointer;" onclick="window.location.href='profile.html?uid=${u.id}'">${u.name || 'İsimsiz'}</span>
      <select style="width:auto; min-width:130px; padding:0.5rem;" onchange="window.changeUserRole('${u.id}', this.value, '${(u.name || u.email || '').replace(/'/g, "\\'")}')">
        <option value="artist" ${u.role === 'artist' ? 'selected' : ''}>Sanatçı</option>
        <option value="producer" ${u.role === 'producer' ? 'selected' : ''}>Prodüktör</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Yönetici</option>
      </select>
    </div>
  `).join('');

  matches.forEach(u => {
    window.getUserAvatar(u.id).then(url => {
      const el = document.getElementById(`usr-av-${u.id}`);
      if (el) el.innerHTML = window.renderAvatarHtml(url, 28, u.name || 'User');
    });
  });
}

window.approveUser = async function(uid, name) {
  try {
    await setDoc(doc(db, "users", uid), { isApproved: true }, { merge: true });
    window.logActivity('Kullanıcıyı onayladı', name);
    alert("Kullanıcıya sisteme erişim izni verildi.");
    loadUsers(); // Listeyi yenile
  } catch(e) {
    alert("Yetki Hatası: " + e.message);
  }
}

window.changeUserRole = async function(uid, role, name) {
  try {
    // Admin yapılırken isApproved otomatik true olsun
    const data = role === 'admin' ? { role: role, isApproved: true } : { role: role };
    await setDoc(doc(db, "users", uid), data, { merge: true });
    window.logActivity(`Rolü "${role}" yaptı`, name);

    const cached = allUsersCache.find(u => u.id === uid);
    if (cached) Object.assign(cached, data);

    alert("Kullanıcı rolü başarıyla güncellendi.");
  } catch(e) {
    alert("Yetki Hatası: " + e.message);
  }
}

// ---------- Prodüktöre Görev / Mesaj Gönderme ----------
// allUsersCache zaten loadUsers() tarafından dolduruluyor, burada ekstra okuma yapmıyoruz.
function loadTaskAssignTargets() {
  const prodSelect = document.getElementById('task-producer-select');
  const userSelect = document.getElementById('task-user-select');
  if (!prodSelect || !userSelect) return;

  let prodOptions = '<option value="">-- Prodüktör seç --</option>';
  let userOptions = '<option value="">-- İlgili kullanıcı (opsiyonel) --</option>';

  allUsersCache.forEach(u => {
    const label = `${u.name || 'İsimsiz'} (${u.email})`;
    if (u.role === 'producer' || u.role === 'admin') {
      prodOptions += `<option value="${u.id}">${label}</option>`;
    }
    userOptions += `<option value="${u.id}" data-name="${(u.name || u.email || '').replace(/"/g, '')}">${label}</option>`;
  });

  prodSelect.innerHTML = prodOptions;
  userSelect.innerHTML = userOptions;
}

async function sendProducerTask() {
  const prodSelect = document.getElementById('task-producer-select');
  const userSelect = document.getElementById('task-user-select');
  const msgInput = document.getElementById('task-message-input');
  const btn = document.getElementById('btn-send-task');

  const producerId = prodSelect.value;
  const message = msgInput.value.trim();
  if (!producerId) return alert("Lütfen bir prodüktör seçin.");
  if (!message) return alert("Lütfen bir görev/mesaj yazın.");

  const targetUserId = userSelect.value || null;
  const targetUserName = targetUserId ? userSelect.options[userSelect.selectedIndex].dataset.name : null;

  btn.disabled = true;
  btn.innerText = "Gönderiliyor...";

  try {
    await addDoc(collection(db, `tasks/${producerId}/assigned`), {
      message,
      targetUserId,
      targetUserName,
      done: false,
      createdAt: serverTimestamp()
    });

    // Prodüktöre bildirim gönder
    window.sendNotification(producerId, `Yöneticiden yeni bir görev aldın: "${message.substring(0, 40)}"`, 'task_assign', 'dashboard.html');

    const prodName = prodSelect.options[prodSelect.selectedIndex].innerText;
    window.logActivity('Prodüktöre görev gönderdi', prodName);

    msgInput.value = '';
    userSelect.value = '';
    if (window.showToast) window.showToast("Görev prodüktöre gönderildi.");
    else alert("Görev prodüktöre gönderildi.");
  } catch (e) {
    alert("Hata: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Gönder";
  }
}

// ---------- Aktivite Günlüğü ----------
async function loadActivityLog() {
  const list = document.getElementById('activity-log-list');
  if (!list) return;

  try {
    const q = query(collection(db, "activity_log"), orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = '<p style="font-size:0.8rem; color:var(--mut);">Henüz bir kayıt yok.</p>';
      return;
    }

    list.innerHTML = '';
    snap.forEach(d => {
      const a = d.data();
      const time = a.createdAt ? a.createdAt.toDate().toLocaleString('tr-TR') : '';
      list.innerHTML += `
        <div style="font-size:0.78rem; padding:0.6rem 0; border-bottom:1px solid var(--line);">
          <span style="color:#fff; font-weight:bold;">${a.actorName}</span> ${a.action}${a.targetName ? `: <span style="color:var(--shn-pink);">${a.targetName}</span>` : ''}
          <span style="color:var(--mut); float:right;">${time}</span>
        </div>
      `;
    });
  } catch (e) {
    list.innerHTML = `<p style="color:var(--bad)">Aktivite günlüğü yüklenemedi: ${e.message}</p>`;
  }
}
