
// @ts-ignore
import { initializeApp } from "firebase/app";
// Fix: Use named exports from firebase/auth for v9+ modular SDK
// @ts-ignore
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Fix: Use @ts-ignore to resolve missing export member errors in environments with broken storage types
// @ts-ignore
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

// ملاحظة: يجب وضع قيم المشروع الخاصة بك هنا في حال استخدام مشروع خاص
// وإلا سيعتمد التطبيق على التهيئة التلقائية للمنصة
const firebaseConfig = {
  apiKey: "AIzaSyBfwxs-2wnTMzU6cA_PNCf8xRCKJpbu3IQ",
  authDomain: "collectionstore-6e14c.firebaseapp.com",
  projectId: "collectionstore-6e14c",
  storageBucket: "collectionstore-6e14c.firebasestorage.app",
  messagingSenderId: "891941546892",
  appId: "1:891941546892:web:950f598ee27a2f964d84a9",
  measurementId: "G-8M5N61GKRD"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Fix: Export storage utilities so they can be consumed via our centralized firebase service
export { ref, uploadString, getDownloadURL };
export const googleProvider = new GoogleAuthProvider();
