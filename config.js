const firebase = require("firebase");

// Initialize Firebase with your project's configuration
firebaseConfig = {
    apiKey: "AIzaSyBdetpUQHYeuCMpB3wJz7vhXci24hkTpww",
    authDomain: "viable-diamonds.firebaseapp.com",
    projectId: "viable-diamonds",
    storageBucket: "viable-diamonds.appspot.com",
    messagingSenderId: "708574852325",
    appId: "1:708574852325:web:994092d62e375361f4500c",
    measurementId: "G-T74V4SLPYE"
  };
  firebase.initializeApp(firebaseConfig)
  // .then(() => {
  //   console.log("Firebase initialized successfully!");
  // })
  // .catch((error) => {
  //   console.error("Error initializing Firebase:", error);
  // });
  

// Get a reference to the Firestore database
const db = firebase.firestore();

// Get a reference to the "Users" collection
const User = db.collection("Users");

// Export the reference to the "Users" collection for use in other parts of your application
module.exports = User;





//   // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyBdetpUQHYeuCMpB3wJz7vhXci24hkTpww",
//   authDomain: "viable-diamonds.firebaseapp.com",
//   projectId: "viable-diamonds",
//   storageBucket: "viable-diamonds.appspot.com",
//   messagingSenderId: "708574852325",
//   appId: "1:708574852325:web:994092d62e375361f4500c",
//   measurementId: "G-T74V4SLPYE"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);