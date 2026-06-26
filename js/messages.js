import { db } from './firebase.js';
import { collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, arrayUnion, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let currentChatId = null;
let currentChatType = null; // '1v1' or 'group'
let currentPeerId = null; // null for groups
let currentChatName = null;
let unsubChat = null;
let chatdelModal = null;
let deleteTargetId = null;

// to look up names/roles for group chat messages
let userCache = {};
let myTeams = []; // to check if someone is a team member

document.addEventListener('DOMContentLoaded', async () => {
  chatdelModal = document.getElementById('chatdel-modal');
  await loadUserCacheAndTeams();
  loadChatList();

  document.getElementById('msg-back').addEventListener('click', () => {
    document.getElementById('chat-view').classList.add('hidden');
    document.getElementById('chat-list').classList.remove('hidden');
    document.getElementById('msg-back').style.display = 'none';
    if(unsubChat) unsubChat();
  });

  document.getElementById('chat-send').addEventListener('click', sendMessage);

  document.getElementById('chatdel-cancel').addEventListener('click', () => {
    chatdelModal.style.display = 'none';
    deleteTargetId = null;
  });

  document.getElementById('chatdel-self').addEventListener('click', () => deleteChatAction('self'));
  document.getElementById('chatdel-both').addEventListener('click', () => deleteChatAction('both'));
});

async function loadUserCacheAndTeams() {
  const uid = localStorage.getItem('uid');
  if(!uid) return;

  try {
    const uSnap = await getDocs(collection(db, "users"));
    uSnap.forEach(d => {
      userCache[d.id] = d.data();
    });

    const tSnap = await getDocs(collection(db, "teams"));
    tSnap.forEach(d => {
      const data = d.data();
      if(data.members && data.members.find(m => m.uid === uid)) {
        myTeams.push(data);
      }
    });
  } catch(e) {
    console.error("Cache error", e);
  }
}

function getRoleTagHtml(senderId, role) {
  // Check if they are in the same team as me
  let inSameTeam = false;
  for(let t of myTeams) {
    if(t.members && t.members.find(m => m.uid === senderId)) {
      inSameTeam = true;
      break;
    }
  }

  if(inSameTeam && senderId !== localStorage.getItem('uid')) {
    return `<span style="font-size:0.6rem; background:var(--shn-pink); color:#000; padding:2px 5px; border-radius:5px; margin-left:5px; font-weight:bold;">[EKİP ÜYESİ]</span>`;
  }

  let tag = '';
  let bg = '#444';
  if(role === 'admin') { tag = 'YÖNETİCİ'; bg = '#e3b341'; }
  else if(role === 'producer') { tag = 'PRODÜKTÖR'; bg = '#b83b5e'; }
  else if(role === 'artist') { tag = 'SANATÇI'; bg = '#6a2c70'; }
  
  if(!tag) return '';
  return `<span style="font-size:0.6rem; background:${bg}; color:#fff; padding:2px 5px; border-radius:5px; margin-left:5px; font-weight:bold;">[${tag}]</span>`;
}

async function loadChatList() {
  const uid = localStorage.getItem('uid');
  if(!uid) return;
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  let count = 0;

  try {
    // 1. Load Group Chats
    const groupsQ = query(collection(db, "chats"), where("type", "==", "group"), where("participants", "array-contains", uid));
    const groupSnap = await getDocs(groupsQ);
    groupSnap.forEach(gDoc => {
      count++;
      const d = gDoc.data();
      const cId = gDoc.id;
      list.innerHTML += `
        <div class="chat-row" style="display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer;">
          <div style="display:flex; align-items:center; gap:10px; flex:1;" onclick="window.openGroupChat('${cId}', '${d.name.replace(/'/g, "\\'")}')">
            <div class="avatar" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#222;font-family:'Syncopate';color:var(--shn-pink);">G</div>
            <div>
              <div class="cr-name">${d.name} (Grup)</div>
              <div class="cr-last">Ekip sohbetine katıl</div>
            </div>
          </div>
        </div>
      `;
    });

    // 2. Load 1v1 Chats (existing logic)
    // To avoid fetching all users if not needed, we'll just iterate userCache
    for(let peerId in userCache) {
      if(peerId !== uid) {
        const d = userCache[peerId];
        const cId = [uid, peerId].sort().join('_');
        
        let isDeletedForMe = false;
        try {
          const cDoc = await getDoc(doc(db, "chats", cId));
          if(cDoc.exists() && cDoc.data().deletedBy && cDoc.data().deletedBy.includes(uid)) {
            isDeletedForMe = true;
          }
        } catch(err) {}

        if(!isDeletedForMe) {
          count++;
          const avatarHtml = d.avatarUrl 
            ? `<div class="avatar" style="width:40px;height:40px;background-size:cover;background-position:center;background-image:url(${d.avatarUrl})"></div>`
            : `<div class="avatar" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#222;font-family:'Syncopate';">${d.name ? d.name.charAt(0).toUpperCase() : '?'}</div>`;

          list.innerHTML += `
            <div class="chat-row" style="display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer;">
              <div style="display:flex; align-items:center; gap:10px; flex:1;" onclick="window.openChat('${peerId}', '${(d.name || d.email).replace(/'/g, "\\'")}', '${d.avatarUrl || ''}')">
                ${avatarHtml}
                <div>
                  <div class="cr-name">${d.name || d.email}</div>
                  <div class="cr-last">Sohbet etmek için tıkla</div>
                </div>
              </div>
              <button class="btn btn-ghost" style="padding:5px 10px; font-size:1.2rem; color:var(--text-mut);" onclick="window.promptDeleteChat('${cId}')">🗑️</button>
            </div>
          `;
        }
      }
    }

    if(count === 0) list.innerHTML = '<p>Gösterilecek sohbet bulunamadı.</p>';
  } catch(e) {
    list.innerHTML = '<p>Liste yüklenemedi: '+e.message+'</p>';
  }
}

window.promptDeleteChat = function(cId) {
  deleteTargetId = cId;
  chatdelModal.style.display = 'flex';
};

async function deleteChatAction(type) {
  if(!deleteTargetId) return;
  const uid = localStorage.getItem('uid');
  chatdelModal.style.display = 'none';

  try {
    const cRef = doc(db, "chats", deleteTargetId);
    if(type === 'self') {
      await setDoc(cRef, { deletedBy: arrayUnion(uid) }, { merge: true });
      if(window.showToast) window.showToast("Sohbet listenden gizlendi.");
    } else if(type === 'both') {
      const msgs = await getDocs(collection(db, "chats", deleteTargetId, "messages"));
      msgs.forEach(async mDoc => {
        await deleteDoc(doc(db, "chats", deleteTargetId, "messages", mDoc.id));
      });
      await deleteDoc(cRef);
      if(window.showToast) window.showToast("Sohbet herkes için kalıcı olarak silindi.");
    }
    loadChatList();
  } catch(e) {
    if(window.showToast) window.showToast("Silme hatası: " + e.message);
  }
}

window.openGroupChat = function(cId, teamName) {
  currentChatId = cId;
  currentChatType = 'group';
  currentPeerId = null;
  currentChatName = teamName;

  document.getElementById('chat-list').classList.add('hidden');
  document.getElementById('chat-view').classList.remove('hidden');
  document.getElementById('msg-back').style.display = 'block';

  document.getElementById('chat-head').innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <div class="avatar" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#222;font-family:'Syncopate';color:var(--shn-pink);">G</div>
      <div class="ch-name">${teamName} (Grup)</div>
    </div>
  `;

  attachMessagesListener();
};

window.openChat = function(peerId, peerName, peerAvatar) {
  const uid = localStorage.getItem('uid');
  currentChatId = [uid, peerId].sort().join('_');
  currentChatType = '1v1';
  currentPeerId = peerId;
  currentChatName = peerName;

  document.getElementById('chat-list').classList.add('hidden');
  document.getElementById('chat-view').classList.remove('hidden');
  document.getElementById('msg-back').style.display = 'block';

  const avatarHtml = peerAvatar 
    ? `<div class="avatar" style="width:30px;height:30px;background-size:cover;background-position:center;background-image:url(${peerAvatar}); border:1px solid var(--shn-pink);"></div>`
    : `<div class="avatar" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#222;font-family:'Syncopate';">${peerName.charAt(0).toUpperCase()}</div>`;

  document.getElementById('chat-head').innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      ${avatarHtml}
      <div class="ch-name">${peerName}</div>
    </div>
  `;

  // Un-hide chat for me if it was deleted
  setDoc(doc(db, "chats", currentChatId), { dummy: true }, { merge: true }).catch(()=>{});

  attachMessagesListener();
};

function attachMessagesListener() {
  if(unsubChat) unsubChat();
  const uid = localStorage.getItem('uid');

  const msgsRef = collection(db, "chats", currentChatId, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"));
  const chatBox = document.getElementById('chat-msgs');
  chatBox.innerHTML = '<p>Yükleniyor...</p>';

  unsubChat = onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = '';
    if(snapshot.empty) {
      chatBox.innerHTML = '<div style="text-align:center; color:var(--text-mut);">Mesaj yok. İlk mesajı sen gönder!</div>';
    }
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const isMine = d.senderId === uid;
      const tClass = isMine ? 'mine' : 'theirs';
      
      const senderData = userCache[d.senderId] || {};
      const senderName = isMine ? localStorage.getItem('userName') : (senderData.name || 'Bilinmiyor');
      const senderRole = isMine ? localStorage.getItem('userRole') : (senderData.role || 'user');
      const senderAvatar = isMine ? localStorage.getItem('userAvatar') : senderData.avatarUrl;

      const pAvHtml = senderAvatar ? `<div style="width:30px;height:30px;border-radius:50%;background-image:url(${senderAvatar});background-size:cover;margin-top:5px;flex-shrink:0;"></div>` : `<div style="width:30px;height:30px;border-radius:50%;background:#333;margin-top:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:white;">${senderName.charAt(0).toUpperCase()}</div>`;

      const roleTag = getRoleTagHtml(d.senderId, senderRole);

      chatBox.innerHTML += `
        <div style="display:flex; gap:8px; ${isMine ? 'flex-direction:row-reverse;' : ''} margin-bottom:12px;">
          ${pAvHtml}
          <div style="display:flex; flex-direction:column; max-width:80%;">
            <div style="font-size:0.7rem; color:var(--mut); margin-bottom:3px; ${isMine ? 'text-align:right;' : ''}">${senderName} ${roleTag}</div>
            <div class="bubble ${tClass}" style="max-width:100%;">
              <div class="b-text">${d.text}</div>
            </div>
          </div>
        </div>
      `;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text || !currentChatId) return;

  const uid = localStorage.getItem('uid');
  input.value = '';

  try {
    if(currentChatType === '1v1') {
      await setDoc(doc(db, "chats", currentChatId), { deletedBy: [] }, { merge: true });
    }

    await addDoc(collection(db, "chats", currentChatId, "messages"), {
      text: text,
      senderId: uid,
      createdAt: serverTimestamp()
    });
    
    // Notifications logic
    if(currentChatType === '1v1' && currentPeerId) {
      await addDoc(collection(db, `notifications/${currentPeerId}/user_notifications`), {
        message: `${localStorage.getItem('userName')} sana yeni bir mesaj gönderdi: "${text.substring(0,20)}..."`,
        createdAt: serverTimestamp(),
        type: 'chat_msg',
        link: 'messages.html'
      });
    } else if(currentChatType === 'group') {
       // Send notification to all other participants
       const cDoc = await getDoc(doc(db, "chats", currentChatId));
       if(cDoc.exists() && cDoc.data().participants) {
          const parts = cDoc.data().participants;
          for(let pId of parts) {
            if(pId !== uid) {
              await addDoc(collection(db, `notifications/${pId}/user_notifications`), {
                message: `${localStorage.getItem('userName')} "${currentChatName}" grubuna mesaj gönderdi.`,
                createdAt: serverTimestamp(),
                type: 'chat_msg',
                link: 'messages.html'
              });
            }
          }
       }
    }
  } catch(e) {
    if(window.showToast) window.showToast("Mesaj gönderilemedi: " + e.message);
  }
}
