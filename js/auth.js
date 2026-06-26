import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Check if we are on login page
const isLoginPage = window.location.pathname.includes('login.html');

export { auth };

export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!user.emailVerified) {
        if (isLoginPage) {
          const lBox = document.getElementById('login-box');
          const vBox = document.getElementById('verify-box');
          if(lBox) lBox.style.display = 'none';
          if(vBox) vBox.style.display = 'block';
        } else {
          window.location.href = 'login.html';
        }
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
  // Show allowed links (they are hidden by default to prevent flicker)
  const elements = document.querySelectorAll('[data-role]');
  elements.forEach(el => {
    const allowedRoles = el.getAttribute('data-role').split(',');
    if (allowedRoles.includes(role) || allowedRoles.includes('all')) {
      if (el.tagName.toLowerCase() === 'a') {
        el.style.display = 'flex'; // sidebar links use flex
      } else {
        el.style.display = 'block';
      }
    } else {
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
  // signOut yapmıyoruz ki verify-box'ta kalabilsin
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
