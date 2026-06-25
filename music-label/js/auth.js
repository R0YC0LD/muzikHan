import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Check if we are on login page
const isLoginPage = window.location.pathname.includes('login.html');

export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!user.emailVerified) {
        alert("Lütfen önce e-postanızı doğrulayın!");
        await signOut(auth);
        return;
      }

      // Fetch user role
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let role = 'artist'; // default
      let name = user.email.split('@')[0];
      let avatar = '';
      
      if (userDoc.exists()) {
        role = userDoc.data().role || 'artist';
        name = userDoc.data().name || name;
        avatar = userDoc.data().avatarUrl || '';
      } else {
        // Create user doc if missing
        await setDoc(doc(db, "users", user.uid), { email: user.email, name, role, avatarUrl: '' });
      }

      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', name);
      localStorage.setItem('userAvatar', avatar);
      localStorage.setItem('uid', user.uid);

      if (isLoginPage) {
        window.location.href = 'dashboard.html';
      } else {
        // Setup UI permissions based on role
        applyPermissions(role);
      }
    } else {
      localStorage.clear();
      if (!isLoginPage) {
        window.location.href = 'login.html';
      }
    }
  });
}

function applyPermissions(role) {
  // Hide all restricted links first
  const elements = document.querySelectorAll('[data-role]');
  elements.forEach(el => {
    const allowedRoles = el.getAttribute('data-role').split(',');
    if (!allowedRoles.includes(role) && !allowedRoles.includes('all')) {
      el.style.display = 'none';
    }
  });

  const userNameDisplay = document.getElementById('user-name-display');
  if(userNameDisplay) {
    userNameDisplay.innerText = localStorage.getItem('userName');
  }
}

export async function registerUser(email, pass) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  await sendEmailVerification(cred.user);
  await signOut(auth);
  window.showToast("Kayıt başarılı! Lütfen e-postanızı doğrulayın.");
  location.reload();
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

// Global logout hook
window.logoutUser = () => {
  logout();
};
