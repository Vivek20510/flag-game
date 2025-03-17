// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDhiZ583YB38HXkmu8Bazjrfajq85xCIew",
  authDomain: "guesstheflag-7e963.firebaseapp.com",
  projectId: "guesstheflag-7e963",
  storageBucket: "guesstheflag-7e963.firebasestorage.app",
  messagingSenderId: "622050273178",
  appId: "1:622050273178:web:ea93bc4dff91ce1e603c23",
  measurementId: "G-PXEYNB6K2C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);



export { db };