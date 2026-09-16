import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPrjVh0t8ctS5PaC2cnf3MV1dUiu_BDek",
  authDomain: "narayaneeyam-app.firebaseapp.com",
  projectId: "narayaneeyam-app",
  storageBucket: "narayaneeyam-app.firebasestorage.app",
  messagingSenderId: "182082387475",
  appId: "1:182082387475:web:c8572e27daab09f0c5c9e6",
  measurementId: "G-TFQGHK54CD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, collection, addDoc, serverTimestamp };
console.log("Firebase initialization status: Success. App name:", app.name);