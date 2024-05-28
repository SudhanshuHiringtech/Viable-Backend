const firebase = require("firebase");

// Initialize Firebase with your project's configuration
// firebaseConfig = {
//     apiKey: "AIzaSyBdetpUQHYeuCMpB3wJz7vhXci24hkTpww",
//     authDomain: "viable-diamonds.firebaseapp.com",
//     projectId: "viable-diamonds",
//     storageBucket: "viable-diamonds.appspot.com",
//     messagingSenderId: "708574852325",
//     appId: "1:708574852325:web:994092d62e375361f4500c",
//     measurementId: "G-T74V4SLPYE"
//   };

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID
};
  firebase.initializeApp(firebaseConfig)
  .then(() => {
    console.log("Firebase initialized successfully!");
  })
  .catch((error) => {
    console.error("Error initializing Firebase:", error);
  });
  

// Get a reference to the Firestore database
const db = firebase.firestore();

// Get a reference to the "Users" collection
const User = db.collection("Users");

// Export the reference to the "Users" collection for use in other parts of your application
module.exports = User;



