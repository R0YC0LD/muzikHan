import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from './auth.js';

async function fetchLeaderboard() {
  const lbList = document.getElementById('lb-list');
  try {
    const snap = await getDocs(collection(db, "demos"));
    let demos = [];
    snap.forEach(doc => {
      const d = doc.data();
      let avg = 0;
      if(d.scoreData && d.scoreData.length > 0) {
        let t = 0;
        d.scoreData.forEach(s => t += ((Number(s.s1||0)+Number(s.s2||0)+Number(s.s3||0))/3));
        avg = t / d.scoreData.length;
      }
      if(avg > 0) {
        demos.push({ id: doc.id, title: d.title, owner: d.ownerName, ownerId: d.ownerId, avg: avg });
      }
    });

    demos.sort((a,b) => b.avg - a.avg);
    demos = demos.slice(0, 10);

    lbList.innerHTML = '';
    if(demos.length === 0) lbList.innerHTML = '<p>Henüz oylanan demo yok.</p>';

      demos.forEach((demo, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? 'top' : '';
      const lbId = `lb-av-${demo.id}`;
      lbList.innerHTML += `
        <div class="lb-item">
          <div class="lb-rank ${rankClass}">#${rank}</div>
          <div id="${lbId}" style="margin-right:10px;"></div>
          <div style="flex:1;">
            <div class="lb-title">${demo.title}</div>
            <div style="font-size:0.62rem; color:var(--text-mut); margin-top:3px;">prod by. ${demo.owner}</div>
          </div>
          <div style="font-family:'Space Mono'; color:var(--shn-pink); font-weight:bold;">
            ${demo.avg.toFixed(1)} / 5
          </div>
        </div>
      `;
      window.getUserAvatar(demo.ownerId).then(avUrl => {
        const avEl = document.getElementById(lbId);
        if(avEl) avEl.innerHTML = window.renderAvatarHtml(avUrl, 30, demo.owner);
      });
    });
  } catch(e) {
    lbList.innerHTML = '<p>Hata veya Yetki Yok.</p>';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if(user) fetchLeaderboard();
  });
});
