import { initAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Dinamik olarak sidebar ve navbar'ı yükle (Sadece login değilse)
  if (!window.location.pathname.includes('login.html')) {
    const sidebarContainer = document.getElementById('sidebar-container');
    const navbarContainer = document.getElementById('navbar-container');

    if (sidebarContainer) {
      const resp = await fetch('components/sidebar.html');
      sidebarContainer.innerHTML = await resp.text();
    }
    
    if (navbarContainer) {
      const resp = await fetch('components/navbar.html');
      navbarContainer.innerHTML = await resp.text();
    }

    // Aktif sayfayı işaretle
    const path = window.location.pathname;
    const pageName = path.split('/').pop().replace('.html', '');
    const activeLink = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if(activeLink) activeLink.classList.add('active');
    
    const pageTitle = document.getElementById('page-title');
    if(pageTitle) pageTitle.innerText = activeLink ? activeLink.innerText.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ ]/g, '').trim() : 'Dashboard';
  }

  initAuth();
});

// UI Toast & Notification Injections
document.addEventListener("DOMContentLoaded", () => {
  if(!document.getElementById("toast")) {
    const t = document.createElement("div");
    t.className = "toast";
    t.id = "toast";
    document.body.appendChild(t);
  }
  if(!document.getElementById("notif-pop")) {
    const n = document.createElement("div");
    n.className = "notif-pop";
    n.id = "notif-pop";
    n.innerHTML = `<div class="np-ic">🔔</div><div><div class="np-t"></div><div class="np-s"></div></div>`;
    document.body.appendChild(n);
  }
});

window.showToast = function(msg) {
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
};

window.showNotif = function(title, text) {
  const el = document.getElementById("notif-pop");
  if(!el) return;
  el.querySelector(".np-t").textContent = title;
  el.querySelector(".np-s").textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 4000);
};

// Override window.alert visually to toast if we want, or just let users manually call showToast instead.


// Global User Avatar Fetcher (Cache)
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase.js";

window.userCache = new Map();

window.getUserAvatar = async function(uid, fallbackName) {
  if(!uid) return "";
  if(window.userCache.has(uid)) {
    return window.userCache.get(uid).avatarUrl || "";
  }
  try {
    const s = await getDoc(doc(db, "users", uid));
    if(s.exists()) {
      window.userCache.set(uid, s.data());
      return s.data().avatarUrl || "";
    }
  } catch(e) {}
  return "";
};

window.renderAvatarHtml = function(url, size, fallbackChar) {
  if(url) {
    return `<div class="avatar" style="width:${size}px;height:${size}px;background-size:cover;background-position:center;background-image:url(${url});flex-shrink:0;"></div>`;
  }
  return `<div class="avatar" style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#222;font-family:'Syncopate';flex-shrink:0;">${fallbackChar ? fallbackChar.charAt(0).toUpperCase() : '?'}</div>`;
};

// Global Notifications Listener
import { collection, query, orderBy, onSnapshot, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./auth.js";

let _notifUnsub = null;
let _firstNotifLoad = true;

onAuthStateChanged(auth, (user) => {
  if(user) {
    if(_notifUnsub) _notifUnsub();
    const q = query(collection(db, `notifications/${user.uid}/user_notifications`), orderBy('createdAt', 'desc'), limit(1));
    _notifUnsub = onSnapshot(q, (snapshot) => {
      if(_firstNotifLoad) {
        _firstNotifLoad = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          window.showNotif("Yeni Bildirim", data.message);
          
          const pop = document.getElementById("notif-pop");
          if(pop) {
             pop.onclick = () => {
                if(data.link) window.location.href = data.link;
             };
             pop.style.cursor = data.link ? "pointer" : "default";
          }
        }
      });
    });
  } else {
    if(_notifUnsub) _notifUnsub();
  }
});

