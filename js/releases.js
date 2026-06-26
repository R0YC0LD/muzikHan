import { auth, db, storage } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  // Kullanıcı adını otomatik doldur
  onAuthStateChanged(auth, (user) => {
    if(user) {
      document.getElementById('rel-artist').value = localStorage.getItem('userName') || user.email.split('@')[0];
    }
  });

  const btn = document.getElementById('submit-release-btn');
  if(btn) btn.addEventListener('click', submitRelease);

  // Pop-up işlemleri
  const openLegal = document.getElementById('open-legal');
  const closeLegal = document.getElementById('close-legal');
  const popup = document.getElementById('legal-popup');

  if(openLegal) openLegal.addEventListener('click', (e) => { e.preventDefault(); popup.style.display = 'flex'; });
  if(closeLegal) closeLegal.addEventListener('click', () => { 
    popup.style.display = 'none'; 
    document.getElementById('rel-agreement').checked = true;
  });
});

async function submitRelease() {
  const title = document.getElementById('rel-title').value;
  const coverFile = document.getElementById('rel-cover').files[0];
  const audioFile = document.getElementById('rel-audio').files[0];
  const date = document.getElementById('rel-date').value;
  const lyrics = document.getElementById('rel-lyrics').value;
  const isExplicit = document.getElementById('rel-explicit').checked;
  const hasLicense = document.getElementById('rel-license').checked;
  const agmt = document.getElementById('rel-agreement').checked;
  
  if(!title || !coverFile || !audioFile || !date) return alert("Tüm zorunlu alanları (Ad, Kapak, Müzik, Tarih) doldurun!");
  if(!agmt) return alert("Kullanıcı sözleşmesini okuyup kabul etmelisiniz.");
  if(!hasLicense) return alert("Beat lisansını onaylamadan yayın yapamazsınız.");
  
  const uid = localStorage.getItem('uid');
  const btn = document.getElementById('submit-release-btn');
  btn.innerText = 'Yükleniyor (Zaman alabilir)...';
  btn.disabled = true;

  try {
    const cRef = ref(storage, `releases_covers/${uid}/${Date.now()}_${coverFile.name}`);
    await uploadBytes(cRef, coverFile);
    const coverUrl = await getDownloadURL(cRef);
    
    const aRef = ref(storage, `releases_audio/${uid}/${Date.now()}_${audioFile.name}`);
    await uploadBytes(aRef, audioFile);
    const audioUrl = await getDownloadURL(aRef);
    
    await addDoc(collection(db, "releases"), {
      title,
      coverUrl,
      audioUrl,
      releaseDate: date,
      lyrics: lyrics || "",
      isExplicit: isExplicit,
      ownerId: uid,
      artistName: document.getElementById('rel-artist').value,
      status: 'bekliyor',
      createdAt: serverTimestamp()
    });
    
    alert("Şarkınız yayına hazırlanmak üzere kurula iletildi!");
    window.location.href = 'dashboard.html';
  } catch (e) {
    alert("Hata: Yükleme başarısız. " + e.message);
  } finally {
    btn.innerText = 'ŞARKINI YAYINLA';
    btn.disabled = false;
  }
}

import { getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if(user && localStorage.getItem('userRole') === 'admin') {
      document.getElementById('admin-releases-section').style.display = 'block';
      loadAdminReleases();
    }
  });
});

async function loadAdminReleases() {
  const list = document.getElementById('releases-list');
  list.innerHTML = 'Yükleniyor...';
  try {
    const snap = await getDocs(collection(db, "releases"));
    if(snap.empty) { list.innerHTML = 'Bekleyen yayın yok.'; return; }
    list.innerHTML = '';
    snap.forEach(d => {
      const data = d.data();
      list.innerHTML += \<div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="color:#fff">\</h4>
          <p style="font-size:0.8rem; color:var(--mut);">Sanatçı: \</p>
        </div>
        <button class="btn btn-ghost" style="color:var(--bad);" onclick="deleteRelease('\')">🗑️ Sil</button>
      </div>\;
    });
  } catch(e) { list.innerHTML = 'Hata: ' + e.message; }
}

window.deleteRelease = async function(id) {
  if(!confirm('Bu yayını silmek istediğinize emin misiniz?')) return;
  try {
    await deleteDoc(doc(db, "releases", id));
    loadAdminReleases();
  } catch(e) { alert('Hata: ' + e.message); }
}

