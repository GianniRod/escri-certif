import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBH5bQqxTClXrngXQ5GAm83xv76LUL1ZXM",
    authDomain: "escri-certif.firebaseapp.com",
    projectId: "escri-certif",
    storageBucket: "escri-certif.firebasestorage.app",
    messagingSenderId: "305662236805",
    appId: "1:305662236805:web:457aa09a08c424356f31ec",
    measurementId: "G-RL2NSMVX2Z"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
