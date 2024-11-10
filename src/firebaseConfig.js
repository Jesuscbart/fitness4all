// Importa las funciones que necesitas de Firebase SDK
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCSnUU4nSCOua6fVMCaKxfa4-waDEXav98",
  authDomain: "fitness4all-c7fa2.firebaseapp.com",
  projectId: "fitness4all-c7fa2",
  storageBucket: "fitness4all-c7fa2.firebasestorage.app",
  messagingSenderId: "18664929793",
  appId: "1:18664929793:web:07c33a30f46c0700481e00",
  measurementId: "G-583J7G0MFY"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { auth, db, analytics };

