const express = require('express');
const cors = require("cors");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const User = require("./model/User");
const authRoutes = require("./routes/auth");


const app = express();
//hello

 
app.use(express.json());
app.use(cors());

app.use(authRoutes);
app.use(contentRoutes);




app.get('/', (req, res) => {
  res.send("Hello World");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


