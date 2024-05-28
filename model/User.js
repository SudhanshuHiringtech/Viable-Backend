// models/User.js

const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// models/User.js


const User = {
  create: async (username, profile, email, gender, password, employee) => {
    try {
      // Check if username is provided
      if (!username) {
        throw new Error("Username is required");
      }

      const newUserRef = await db.collection("users").add({
        username: username,
        profile: profile,
        email: email,
        gender: gender,
        password: password,
        employee: employee,
      });

      return { id: newUserRef.id, username, email, password, profile, gender, employee};
    } catch (error) {
      throw new Error("Error creating user: " + error.message);
    }
  },

  findByEmail: async (email) => {
    try {
      const querySnapshot = await db.collection("users").where("email", "==", email).get();
      if (querySnapshot.empty) {
        return null;
      }
      const userData = querySnapshot.docs[0].data();
      return { id: querySnapshot.docs[0].id, ...userData };
    } catch (error) {
      throw new Error("Error finding user by email: " + error.message);
    }
  }
};

module.exports = User;
