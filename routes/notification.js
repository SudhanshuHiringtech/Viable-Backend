


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
    console.log("Sending notification...");
    await saveNotification(employeeId, 'WorkDone', `Work Done the work  ${workDetails} now you have to verify `, 'Owner');
  };
  
  // Exporting the functions for use in other modules
  module.exports = {
    notifyWorkDone,
    notifyWorkAssignment,
    notifyWorkCompletion,
  };
