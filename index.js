const express = require('express');
const cors = require("cors");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const User = require("./model/User");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chatRoutes");
const taskRoutes = require("./routes/taskRoutes");
const admin = require("firebase-admin");
const http = require('http');
const socketIo = require('socket.io');




const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({extended: false, limit:10000, parameterLimit:3,}));
app.use(authRoutes);
//app.use(chatRoutes);
app.use(taskRoutes);


app.get('/', (req, res) => {
  res.send("Hello World");
});



io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', ({ userId }) => {
    socket.join(userId);
  });

  socket.on('sendMessage', async ({ userId, recipientId, text }) => {
    const newMessage = {
      senderId: userId,
      recipientId,
      text,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection('users').doc(userId).collection('messages').add(newMessage);
      await db.collection('users').doc(recipientId).collection('messages').add(newMessage);
      io.to(recipientId).emit('receiveMessage', newMessage);
    } catch (error) {
      console.error('Error sending message: ', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});





// const express = require("express");
// const multer = require("multer");
// const admin = require("firebase-admin");
// const serviceAccount = require("./serviceAccountKey.json");
// const saltedMd5=require('salted-md5');
// const path=require('path');
//  const cors = require("cors");
//  const jwt = require("jsonwebtoken");
//  require('dotenv').config();
//  //const admin = require("firebase-admin");
// const User = require("./model/User");
// // const authRoutes = require("./routes/auth");
// // const chatRoutes = require("./routes/chatRoutes");
// // const taskRoutes = require("./routes/taskRoutes");


// // admin.initializeApp({
// //   credential: admin.credential.cert(serviceAccount),
// //   storageBucket: "viablediamonds.appspot.com" // Specify your Cloud Storage bucket name here
// // });
// const app = express();
// //
// const db = admin.firestore();
// const estorage = admin.storage().bucket();
// console.log(estorage);

// //const router = express.Router();

// const upload=multer({storage: multer.memoryStorage()})


// app.post('/upload',upload.single('file'),async(req,res)=>{
//   const name = saltedMd5(req.file.originalname, 'SUPER-S@LT!')
//   const fileName = name + path.extname(req.file.originalname)
//   await estorage.file(fileName).createWriteStream().end(req.file.buffer)
//   res.send('done');
// })

// app.get('/', (req, res) => {
//   res.send("Hello World");
// });

// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });





// //module.exports = router;