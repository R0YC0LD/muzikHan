import { db } from './firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  // Give auth a moment to load
  setTimeout(loadStats, 1000);
});

async function loadStats() {
  const role = localStorage.getItem('userRole') || 'artist';
  const uid = localStorage.getItem('uid');
  if(!uid) return;

  try {
    let demosSnap, relSnap, beatsSnap, presetsSnap;

    // Yetki kontrolüne göre veri çekme
    if(role === 'admin' || role === 'crew' || role === 'producer') {
      demosSnap = await getDocs(collection(db, "demos"));
      beatsSnap = await getDocs(collection(db, "beats"));
      presetsSnap = await getDocs(collection(db, "presets"));
    } else {
      // Sadece sanatçının kendi yükledikleri
      demosSnap = await getDocs(query(collection(db, "demos"), where("ownerId", "==", uid)));
      beatsSnap = { size: 0 }; // Sanatçı beat göremez
      presetsSnap = { size: 0 }; // Sanatçı preset göremez
    }

    // Release için admin/crew tüm bekleyenleri, artist sadece kendininkini görür
    if(role === 'admin' || role === 'crew') {
      relSnap = await getDocs(query(collection(db, "releases"), where("status", "==", "bekliyor")));
    } else {
      relSnap = await getDocs(query(collection(db, "releases"), where("ownerId", "==", uid), where("status", "==", "bekliyor")));
    }
    
    // DOM Güncelleme
    const stDemos = document.getElementById('stat-demos');
    const stRel = document.getElementById('stat-releases');
    const stBeats = document.getElementById('stat-beats');
    const stPresets = document.getElementById('stat-presets');

    if(stDemos) stDemos.innerText = demosSnap.size;
    if(stRel) stRel.innerText = relSnap.size;
    if(stBeats) stBeats.innerText = beatsSnap.size;
    if(stPresets) stPresets.innerText = presetsSnap.size;

  } catch(e) {
    console.error("Dashboard Stats Error:", e);
  }
}
