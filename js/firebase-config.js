// ===== КОНФИГУРАЦИЯ FIREBASE (МОДУЛЬНЫЙ СИНТАКСИС) =====

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, 
         createUserWithEmailAndPassword, 
         signInWithEmailAndPassword,
         signInWithPopup,
         signInAnonymously,
         GoogleAuthProvider,
         signOut,
         onAuthStateChanged,
         sendPasswordResetEmail,
         updateProfile,
         updatePassword,
         reauthenticateWithCredential,
         EmailAuthProvider,
         sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, 
         collection, 
         doc, 
         getDoc, 
         setDoc, 
         updateDoc,
         query,
         where,
         orderBy,
         limit,
         getDocs,
         serverTimestamp,
         runTransaction,
         enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, 
         ref, 
         uploadBytes, 
         getDownloadURL 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6ReDa8vH044Yun5CkkzGNISuMDp4rtW8",
    authDomain: "jujutsu-fight.firebaseapp.com",
    projectId: "jujutsu-fight",
    storageBucket: "jujutsu-fight.firebasestorage.app",
    messagingSenderId: "506548974802",
    appId: "1:506548974802:web:3ac719e1381d561973290b",
    measurementId: "G-6DP2F3WBJN"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Включаем персистентность данных (офлайн режим)
enableIndexedDbPersistence(db)
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('⚠️ Персистентность недоступна (несколько вкладок)');
        } else if (err.code === 'unimplemented') {
            console.log('⚠️ Браузер не поддерживает персистентность');
        }
    });

// Экспорт для использования в других модулях
export { 
    app,
    auth, 
    db, 
    storage,
    analytics,
    // Auth функции
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInAnonymously,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendEmailVerification,
    // Firestore функции
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    runTransaction,
    // Storage функции
    ref,
    uploadBytes,
    getDownloadURL
};

console.log('🔥 Firebase инициализирован');