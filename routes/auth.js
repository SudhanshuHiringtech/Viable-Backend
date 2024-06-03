// routes/auth.js

const express = require('express');
const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { v4: uuidv4 } = require('uuid');
const multer = require("multer");

const admin = require("firebase-admin");
const db = admin.firestore();

const estorage = admin.storage().bucket();
const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() });

const bcrypt = require('bcrypt');

// RegisterEmployee function to handle user registration
const RegisterEmployee = async (req, res) => {
  console.log(req.body);
  console.log(req.file);
  let { username, email, gender, password, status, designation } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Handle profile image upload using multer
    const profileImage = req.file; // Access the uploaded file
    let profileImageURL = '';

    if (profileImage) {
      const profileImageFileName = `profiles/${uuidv4()}.jpg`;
      const profileImageRef = estorage.file(profileImageFileName);

      // Upload the image to Firebase Storage
      await profileImageRef.save(profileImage.buffer, {
        metadata: { contentType: profileImage.mimetype },
        resumable: false
      });

      // Generate a signed URL for the profile image
      [profileImageURL] = await profileImageRef.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10); 

    profile =  profileImageURL
    password = hashedPassword
    // Save user data to Firestore
    User.create ( username,
      profile,
      email,
      gender,
      password,
      status,
      designation
    )

    const response = "Successfully Registered as Employee";
    res.json({ message: response,});
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
    
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    // if (!isPasswordValid) {
    //   return res.status(401).json({ error: "Invalid password" });
    // }

    const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
    // Respond with access token and all user data
    res.json({ accessToken: accessToken, userData: user});
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
router.post('/register', upload.single('profile'), RegisterEmployee);
// Route for user signup
router.post("/login", login); // Route for user login
router.get("/logout", logout);


// router.get("/protected", authenticateToken, protectedRoute); // Protected route

module.exports = router;
