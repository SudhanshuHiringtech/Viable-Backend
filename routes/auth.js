// routes/auth.js

const express = require('express');
const jwt = require("jsonwebtoken");
const User = require("../model/User");

const admin = require("firebase-admin");
const db = admin.firestore();

const router = express.Router()

const RegisterEmpolyee= async (req, res) => {
  const {username, profile, email, gender, password, status, designation} = req.body;

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const newUser = await User.create(username, profile, email, gender, password, status, designation);

    const allUserData = [];
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach(doc => {
      allUserData.push(doc.data());
    });
    const response = "Successfully Register as Empolyee";
    res.json({allUserData: allUserData });
  } catch (error) {
    console.error("Error signing up:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const login = async (req, res) => {
  const { email, password } = req.body;
     //console.log("email", email);
  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
    const allUserData = [];
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach(doc => {
      allUserData.push(doc.data());
    });
    // Respond with access token and all user data
    res.json({ accessToken: accessToken, userData: user,allUserData: allUserData });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const logout = (req, res) => {
  // Logout API just sends a response indicating successful logout
  res.json({ message: "Logout successful" });
};

router.get('/users', async (req, res) => {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      console.log('No matching documents.');
      return res.status(404).json({ message: 'No users found' });
    }

    const users = [];
    snapshot.forEach(doc => {
      users.push(doc.data());
    });

    return res.json(users);
  } catch (error) {
    console.error('Error getting documents', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// const protectedRoute = (req, res) => {
//   res.json({ message: "This is a protected route" });
// };

// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).json({ error: "Forbidden" });
//     }
//     req.user = user;
//     next();
//   });
// };

// Routes
 router.post("/Register", RegisterEmpolyee); // Route for user signup
router.post("/login", login); // Route for user login
router.get("/logout", logout);


// router.get("/protected", authenticateToken, protectedRoute); // Protected route

module.exports = router;
