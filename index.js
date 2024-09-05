const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./model/User');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/taskRoutes');
const masterDataRoutes = require('./routes/MasterDataRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // Corrected spelling
const admin = require('firebase-admin');
const http = require('http');
// const socketIo = require('socket.io'); // Uncomment if using Socket.io

const app = express();
const server = http.createServer(app);
// const io = socketIo(server); // Uncomment if using Socket.io

// Firebase Admin Initialization (if needed)
// admin.initializeApp({
//   credential: admin.credential.applicationDefault(),
//   databaseURL: process.env.FIREBASE_DATABASE_URL
// });

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false, limit: 10000, parameterLimit: 3 }));

// Directly use routes without specific path prefixes
app.use(authRoutes);
app.use(taskRoutes);
app.use(masterDataRoutes);
app.use(notificationRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.get('/', (req, res) => {
  res.send('Hello World');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



































// const express = require('express');
// const cors = require("cors");
// const jwt = require("jsonwebtoken");
// require('dotenv').config();
// const User = require("./model/User");
// const authRoutes = require("./routes/auth");
// const taskRoutes = require("./routes/taskRoutes");
// const masterDataRoutes = require("./routes/MasterDataRoutes");
// const notificationRoutes = require("./routes/notifcationRoutes");
// const admin = require("firebase-admin");
// const http = require('http');

// //const socketIo = require('socket.io');




// const app = express();
// const server = http.createServer(app);
// //const io = socketIo(server);

// app.use(express.json());
// app.use(cors());
// app.use(express.urlencoded({extended: false, limit:10000, parameterLimit:3,}));
// app.use(authRoutes);

// app.use(taskRoutes);
// app.use(masterDataRoutes);
// app.use(notificationRoutes);



// app.get('/', (req, res) => {
//   res.send("Hello World");
// });


// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
