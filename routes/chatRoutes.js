const express = require('express');


const admin = require("firebase-admin");
const db = admin.firestore();

const router = express.Router()


// Route to send message
router.post('/send-message', async (req, res) => {
    const { senderId, recipientId, messageId, messageContent } = req.body;
  
    try {
      await addMessage(senderId, recipientId, messageId, messageContent);
      res.status(201).send({ message: 'Message sent successfully' });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).send({ error: 'Failed to send message' });
    }
  });
  
  // Route to get messages for a user
  router.get('/user-messages/:userId', async (req, res) => {
    const userId = req.params.userId;
  
    try {
      const messages = await getUserMessages(userId);
      res.status(200).send(messages);
    } catch (error) {
      console.error('Error getting messages for user:', error);
      res.status(500).send({ error: 'Failed to get messages for user' });
    }
  });
  
  // Function to add a message to a user's messages collection
  const addMessage = async (senderId, recipientId, messageId, messageContent) => {
    const senderRef = db.collection('users').doc(senderId);
    const recipientRef = db.collection('users').doc(recipientId);
  
    // Add message to sender's messages collection
   
    await senderRef.collection('messages').add({
      senderId,
      recipientId,
      messageContent,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  
    // Add message to recipient's messages collection
    await recipientRef.collection('messages').add({
      senderId,
      recipientId,
      messageContent,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  };
  
  // Function to get all messages for a user
  const getUserMessages = async (userId) => {
    const userRef = db.collection('users').doc(userId);
    const messagesRef = userRef.collection('messages');
  
    const snapshot = await messagesRef.get();
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    return messages;
  };
  

  module.exports = router;
