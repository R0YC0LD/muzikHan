import { db } from './firebase.js';
import { collection, addDoc, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, orderBy, arrayUnion, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let currentChatId = null;
let currentChatUser = null;
let currentPeerId = null;
let unsubChat = null;
let chatdelModal = null;
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', () => {
  chatdelModal = document.getElementById('chatdel-modal');
  loadChatList();

  document.getElementById('msg-back').addEventListener('click', () => {
    document.getElementById('chat-view').classList.add('hidden');
    document.getElementById('chat-list').classList.remove('hidden');
    document.getElementById('msg-back').style.display = 'none';
    if(unsubChat) unsubChat();
  });

  document.getElementById('chat-send').addEventListener('click', sendMessage);

  // Modal actions
  document.getElementById('chatdel-cancel').addEventListener('click', () => {
    chatdelModal.style.display = 'none';
    deleteTargetId = null;
  });

  document.getElementById('chatdel-self').addEventListener('click', () => deleteChatAction('self'));
  document.getElementById('chatdel-both').addEventListener('click', () => deleteChatAction('both'));
});

async function loadChatList() {
  const uid = localStorage.getItem('uid');
  if(!uid) return;
  const list = document.getElementById('chat-list');
  try {
    const usersQ = await getDocs(collection(db, "users"));
    list.innerHTML = '';
    let count = 0;
    
    // We also need to check if the chat has been "deletedBy" us.
    // To do this simply on client side without a complex query:
    for (const uDoc of usersQ.docs) {
      if(uDoc.id !== uid) {
        const d = uDoc.data();
        const cId = [uid, uDoc.id].sort().join('_');
        
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
              <div style="display:flex; align-items:center; gap:10px; flex:1;" onclick="window.openChat('${uDoc.id}', '${d.name || d.email}', '${d.avatarUrl || ''}')">
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
    list.innerHTML = '<p>Liste yüklenemedi.</p>';
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
      // Delete all messages in subcollection
      const msgs = await getDocs(collection(db, "chats", deleteTargetId, "messages"));
      msgs.forEach(async mDoc => {
        await deleteDoc(doc(db, "chats", deleteTargetId, "messages", mDoc.id));
      });
      // Optionally delete main doc
      await deleteDoc(cRef);
      if(window.showToast) window.showToast("Sohbet herkes için kalıcı olarak silindi.");
    }
    loadChatList();
  } catch(e) {
    if(window.showToast) window.showToast("Silme hatası: " + e.message);
  }
}

window.openChat = function(peerId, peerName, peerAvatar) {
  const uid = localStorage.getItem('uid');
  currentChatId = [uid, peerId].sort().join('_');
  currentPeerId = peerId;
  currentChatUser = peerName;

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

  if(unsubChat) unsubChat();

  const msgsRef = collection(db, "chats", currentChatId, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"));
  const chatBox = document.getElementById('chat-msgs');
  chatBox.innerHTML = '<p>Yükleniyor...</p>';

  // Un-hide chat for me if it was deleted
  setDoc(doc(db, "chats", currentChatId), { dummy: true }, { merge: true }).then(() => {
    // Optionally remove ourselves from deletedBy if we send a message. We will do this on send.
  });

  unsubChat = onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = '';
    if(snapshot.empty) {
      chatBox.innerHTML = '<div style="text-align:center; color:var(--text-mut);">Mesaj yok. İlk mesajı sen gönder!</div>';
    }
    snapshot.forEach(doc => {
      const d = doc.data();
      const isMine = d.senderId === uid;
      const tClass = isMine ? 'mine' : 'theirs';
      
      const pAv = isMine ? localStorage.getItem('userAvatar') : peerAvatar;
      const pAvHtml = pAv ? `<div style="width:20px;height:20px;border-radius:50%;background-image:url(${pAv});background-size:cover;margin-top:5px;"></div>` : '';

      chatBox.innerHTML += `
        <div style="display:flex; gap:8px; ${isMine ? 'flex-direction:row-reverse;' : ''} margin-bottom:8px;">
          ${pAvHtml}
          <div class="bubble ${tClass}">
            <div class="b-text">${d.text}</div>
          </div>
        </div>
      `;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
};

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text || !currentChatId) return;

  const uid = localStorage.getItem('uid');
  input.value = '';

  try {
    // Reactivate chat for both users (remove deletedBy flag)
    await setDoc(doc(db, "chats", currentChatId), { deletedBy: [] }, { merge: true });

    await addDoc(collection(db, "chats", currentChatId, "messages"), {
      text: text,
      senderId: uid,
      createdAt: serverTimestamp()
    });
    
    if(currentPeerId) {
      await addDoc(collection(db, `notifications/${currentPeerId}/user_notifications`), {
        message: `${localStorage.getItem('userName')} sana yeni bir mesaj gönderdi: "${text.substring(0,20)}..."`,
        createdAt: serverTimestamp(),
        type: 'chat_msg'
      });
    }
  } catch(e) {
    if(window.showToast) window.showToast("Mesaj gönderilemedi: " + e.message);
  }
}
