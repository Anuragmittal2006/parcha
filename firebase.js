import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc
} from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_Q0Y4vaU_NuVOVMiQigYHwMWMvupU2kc",
  authDomain: "parcha-1dcab.firebaseapp.com",
  projectId: "parcha-1dcab",
  storageBucket: "parcha-1dcab.firebasestorage.app",
  messagingSenderId: "83741947738",
  appId: "1:83741947738:web:386a335192263407a26563",
  measurementId: "G-7XRRR4HV47"
};

export const app = initializeApp(firebaseConfig);
export const dbCloud = getFirestore(app);

export {
  collection,
  getDocs,
  setDoc,
  doc
};
