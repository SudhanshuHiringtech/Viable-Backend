

const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
const saltedMd5 = require('salted-md5');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const formidable = require('formidable');

const estorage = admin.storage().bucket();
const db = admin.firestore();

const router = express.Router();
  
 // Get notifications for a specific user (owner or employee)
router.get('/notifications', async (req, res) => {
    const { userId, userType } = req.query; // userType could be 'owner' or 'employee'
  
    try {
      let notificationsSnapshot;
  
      if (userType === 'owner') {
        // Fetch all notifications for the owner
        notificationsSnapshot = await db.collection('notifications')
          .where('ownerId', '==', userId)
          .get();
      } else if (userType === 'employee') {
        // Fetch all notifications for the employee
        notificationsSnapshot = await db.collection('notifications')
          .where('employeeId', '==', userId)
          .get();
      } else {
        // If userType is neither 'owner' nor 'employee', return an error
        return res.status(400).json({ error: 'Invalid userType' });
      }
  
      // Map through the documents and return the full data of each document
      const notifications = notificationsSnapshot.docs.map(doc => {
        return { id: doc.id, ...doc.data() };
      });
  
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Error retrieving notifications:', error);
      res.status(500).json({ error: 'Error retrieving notifications' });
    }
  });
  
  
  // Mark notification as read
  router.post('/mark-notification-read', async (req, res) => {
    const { notificationId } = req.body;
  
    try {
      const notificationRef = db.collection('notifications').doc(notificationId);
      await notificationRef.update({ read: true });
      return res.status(200).json("Marked as read");
    } catch (error) {
      res.status(500).send('Error marking notification as read');
    }
  });
  
  // Export the router for use in your Express app
  module.exports = router;