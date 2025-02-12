// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDP6GT8lQmR89nhh4v6EvO4Ci2AWJM4Xsg",
  authDomain: "govmadad.firebaseapp.com",
  projectId: "govmadad",
  storageBucket: "govmadad.firebasestorage.app",
  messagingSenderId: "260517850572",
  appId: "1:260517850572:web:1841099b0985a718128169",
  measurementId: "G-J7F8T8VB47"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };