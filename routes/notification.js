


const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");

const saltedMd5 = require('salted-md5');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const formidable = require('formidable');

const estorage = admin.storage().bucket();
const db = admin.firestore();

const router = express.Router();


const saveNotification = async (userId, title, body, userType) => {
    const notification = {
      userId: userId,
      title: title,
      body: body,
      userType: userType, // 'owner' or 'employee'
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
  
    try {
      // Add the notification and get the document reference
      const docRef = await db.collection('notifications').add(notification);
  
      // Get the document ID
      const docId = docRef.id;
  
      // Update the document by adding the 'Id' field
      await docRef.update({ id: docId });
  
      console.log('Notification saved successfully with ID:', docId);
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };
  
  // Function to save assigned work
  const saveAssignedWork = async (employeeId, workDetails) => {
    await db.collection('workAssignments').add({
      employeeId,
      workDetails,
      status: 'Assigned',
      assignedAt: admin.firestore.Timestamp.now(),
    });
  };
  
  // Function to mark work as completed
  const markWorkAsCompleted = async (workId) => {
    const workDoc = await db.collection('workAssignments').doc(workId).get();
    await workDoc.ref.update({
      status: 'Completed',
      completedAt: admin.firestore.Timestamp.now(),
    });
  };
  
  // Function to notify work assignment
  const notifyWorkAssignment = async (employeeId, workDetails) => {
    console.log("Sending notification...");
    await saveNotification(employeeId, 'New Work Assigned', `You have been assigned a new task: ${workDetails}`, 'Employee');
  };

  const notifyWorkDone = async (employeeId, workDetails, name) => {
    console.log("Sending notification...");
    await saveNotification(employeeId, 'WorkDone', `{name} Done the work  ${workDetails} now you have to verify `, 'Employee');
  };
  
  // Function to notify work completion
  const notifyWorkCompletion = async (employeeId, workDetails,) => {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    console.log(snapshot);
    console.log("Sending notification...");
    await saveNotification(employeeId, 'WorkDone', `Work Done the work  ${workDetails} now you have to verify `, 'Owner');
  };


  async function sendNotification(tokens, title, body) {
    console.log("Tokens received:", tokens);
  
    // Construct the message object correctly
    const payload = {
      notification: {
        title: title,
        body: body,
      },
      // Optional data payload
      data: {
        key1: "value1",
        key2: "value2",
      },
    };
  
    try {
      // Use sendMulticast for multiple tokens
      const message = {
        tokens, // Array of tokens
        ...payload, // Spread the notification and data
      };
  
      const response = await admin.messaging().sendMulticast(message);
      console.log('Notification sent successfully:', response);
  
      // Check for errors in individual results
      response.responses.forEach((result, index) => {
        if (result.error) {
          console.error(`Error for token[${index}]:`, result.error);
        } else {
          console.log(`Notification sent to token[${index}] successfully.`);
        }
      });
  
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  


  
  // Exporting the functions for use in other modules
  module.exports = {
    notifyWorkDone,
    notifyWorkAssignment,
    notifyWorkCompletion,
    sendNotification,
  };
