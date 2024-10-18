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

const { notifyWorkAssignment, notifyWorkCompletion,  } = require('./notification');

// Multer setup with memory storage and file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});


const uploadFiles = upload.fields([
  { name: 'tenderDocuments', maxCount: 3 },
  { name: 'additionalDocuments', maxCount: 3 },
  { name: 'paymentRecipt', maxCount: 3},
  { name: 'poFile', maxCount: 5 }
]);


// Upload route
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const name = saltedMd5(req.file.originalname, 'SUPER-S@LT!');
    const fileName = name + path.extname(req.file.originalname);
    await estorage.file(fileName).createWriteStream().end(req.file.buffer);
    res.send('done');
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Merged API for updating lead and task details
router.post('/leadUpdate_1', async (req, res) => {
    try {
      // Parse the request body data
      const data = req.body;
      
      const {
        leadId, 
        employeeId, 
        leadStatus, 
        address, 
        department,
        tenderNumber,  
        Product,
        offerValidity,
        totalQuantity,
        RA_enabled,
        RCM_applicable,
        typeofBid,
        timeforTechnicalClarification,
        inspectionRequired,
        openingDate, 
        closingDate, 
        portalName, 
        leadMode, // online, offline
        // SDleadMode, // online, offline, exemption
        TenderFeePayment, 
        EMDpayment, 
        SDpayment,
        EMDPaymentMode, // online, offline, exemption
        SDPaymentMode, // online, offline, exemption
        EMDbeneficiaryName,
        SDbeneficiaryName,
        description, 
        masterData, 
        poFile,
        submitOrSave,
      } = data;
  
      // Validate required fields
      if (!leadId || !employeeId) {
        return res.status(400).json({ error: "leadId and employeeId are required" });
      }
      console.log(submitOrSave)
  
      // Fetch the lead from Firestore
      const leadRef = db.collection('leads').doc(leadId);
      const leadSnapshot = await leadRef.get();
  
      // If lead not found, return an error
      if (!leadSnapshot.exists) {
        return res.status(404).json({ error: "Lead not found" });
      }
  
      let leadData = leadSnapshot.data();
      const taskIndex = leadData.tasks.findIndex(task => task.employeeId === employeeId || task.taskId === data.taskId);
  
      // If task not found, return an error
      if (taskIndex === -1) {
        return res.status(404).json({ error: "Task for the given employee not found" });
      }
  
      // Retrieve the task data
      let taskData = leadData.tasks[taskIndex];
  
      // Update task fields with any provided dat
      if (department) taskData.department = department;
      if (Product) taskData.Product = Product;
      if (leadStatus) taskData.leadStatus = leadStatus;
      if (leadMode) taskData.leadMode = leadMode;
      if (address) taskData.address = address;
      if (tenderNumber) taskData.tenderNumber = tenderNumber;
      if (openingDate) taskData.openingDate = openingDate;
      if (closingDate) taskData.closingDate = closingDate;
      if (portalName) taskData.portalName = portalName;
      if (offerValidity) taskData.offerValidity = offerValidity;
      if (totalQuantity) taskData.totalQuantity = totalQuantity;
      if (RA_enabled) taskData.RA_enabled = RA_enabled;
      if (typeofBid) taskData.typeofBid = typeofBid;
      if (timeforTechnicalClarification) taskData.timeforTechnicalClarification = timeforTechnicalClarification;
      if (inspectionRequired) taskData.inspectionRequired = inspectionRequired;
      if (RCM_applicable) taskData.RCM_applicable = RCM_applicable;

      // Additional task fields related to payments and status
      if (TenderFeePayment) taskData.TenderFeePayment = TenderFeePayment;
      if (EMDpayment) taskData.EMDpayment = EMDpayment;
      if (SDpayment) taskData.SDpayment = SDpayment;
      if(EMDbeneficiaryName) taskData.EMDbeneficiaryName = EMDbeneficiaryName;
      if(SDbeneficiaryName) taskData.SDbeneficiaryName = SDbeneficiaryName;
      if (SDPaymentMode) taskData.SDPaymentMode = SDPaymentMode;
      if (EMDPaymentMode) taskData.EMDPaymentMode = EMDPaymentMode;
      if (masterData) taskData.masterData = masterData;
      if (submitOrSave) taskData.submitOrSave = submitOrSave;
      if (poFile) taskData.poFile = poFile;
      if (description) taskData.description = description;
  
      // Update task condition and rejection status
      taskData.verified = false,
      taskData.reject = 0;
      
      if(submitOrSave === true){
        taskData.taskCondition = 'Received';
        console.log("Send Notification to Owner")
      };
  
      // Save the updated task data back to the lead in Firestore
      leadData.tasks[taskIndex] = taskData;
      await leadRef.set(leadData);

   
  
      // Respond with success
      res.status(200).json({
        message: 'Task updated successfully',
        leadId,
        taskData
      });
  
      // Notify task completion
      // const ownerId = 'zeozcVW1P2RloarbiOvw';
      // await notifyWorkCompletion(ownerId, taskData.department);
  
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  


  router.post('/uploadDocuments', upload.array('files'), async (req, res) => {
    try {
      const data = req.body;
      const { leadId, employeeId, documentName, documentDescription, ExpiryDate } = data;
  
      // Validate required fields
      console.log(leadId)
      if (!leadId || !employeeId || !documentName) {
        return res.status(400).json({ error: "leadId, employeeId, and documentName are required" });
      }
  
      // Fetch the lead from Firestore
      const leadRef = db.collection('leads').doc(leadId);
      const leadSnapshot = await leadRef.get();
  
      if (!leadSnapshot.exists) {
        return res.status(404).json({ error: "Lead not found" });
      }
  
      let leadData = leadSnapshot.data();
  
      // Find the task within the lead's tasks array
      const taskIndex = leadData.tasks.findIndex(task => task.employeeId === employeeId || task.taskId === data.taskId);
  
      if (taskIndex === -1) {
        return res.status(404).json({ error: "Task not found for the given employeeId" });
      }
  
      const task = leadData.tasks[taskIndex];
  
      // Check for duplicate documentName within the task's documents
      const duplicate = task.documents?.some(doc => doc.documentName === documentName);
      if (duplicate) {
        return res.status(400).json({ error: "Document with this name already exists" });
      }
  
      // Prepare a new document entry
      const assignedDate = new Date().toISOString();
      const documentId = db.collection('leads').doc().id; // Generate a unique ID
  
      const newDocument = {
        documentId,
        documentName,
        documentDescription,
        assignedDate,
        ExpiryDate: ExpiryDate || null,
        files: [] // Array to store uploaded files
      };
  
      // Upload files to storage and add file details to the new document
      for (const file of req.files) {
        const storagePath = `documents/${documentId}/${file.originalname}`;
        const storageFile = estorage.file(storagePath);
  
        // Save file to storage
        await storageFile.save(file.buffer, { contentType: file.mimetype });
  
        // Generate signed URL for access
        const [url] = await storageFile.getSignedUrl({
          action: 'read',
          expires: '03-09-2491'
        });
  
        newDocument.files.push({
          fileName: file.originalname,
          url,
          storagePath
        });
      }
  
      // Add the new document to the task's documents array
      task.documents = task.documents || [];
      task.documents.push(newDocument);
  
      // Update the task inside the lead's tasks array
      leadData.tasks[taskIndex] = task;
      await leadRef.set(leadData);
  
      res.status(200).json({
        message: 'Document uploaded successfully',
        newDocument
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }); 

  router.delete('/deletedocuments', async (req, res) => {
    const { leadId, taskId, index } = req.body;
  
    try {
      // Fetch the lead document from Firestore
      const leadDoc = await db.collection('leads').doc(leadId).get();
  
      if (!leadDoc.exists) {
        return res.status(404).json({ message: 'Lead not found' });
      }
  
      const leadData = leadDoc.data();
  
      // Find the task using taskId
      const task = leadData.tasks.find(task => task.taskId === taskId);
  
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
  
      // Ensure the index is valid
      if (index >= task.documents.length || index < 0) {
        return res.status(400).json({ message: 'Invalid index' });
      }
  
      // Remove the document from the documents array using splice
      task.documents.splice(index, 1);
  
      // Update the Firestore document with the modified tasks array
      await db.collection('leads').doc(leadId).update({
        tasks: leadData.tasks
      });
  
      res.status(200).json({ message: 'Document deleted successfully', task });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });


  
     
  router.get('/getDocuments', async (req, res) => {
    try {
      const { leadId, employeeId } = req.query; // Use query parameters
  
      // Validate required fields
      if (!leadId || !employeeId) {
        return res.status(400).json({ error: "leadId and employeeId are required" });
      }
  
      // Fetch the lead from Firestore
      const leadRef = db.collection('leads').doc(leadId);
      const leadSnapshot = await leadRef.get();
  
      if (!leadSnapshot.exists) {
        return res.status(404).json({ error: "Lead not found" });
      }
  
      let leadData = leadSnapshot.data();
  
      // Find the task for the given employeeId
      const task = leadData.tasks.find(task => task.employeeId === employeeId);
  
      if (!task) {
        return res.status(404).json({ error: "Task not found for the given employeeId" });
      }
  
      // If no documents exist for the task
      if (!task.documents || task.documents.length === 0) {
        return res.status(404).json({ error: "No documents found for this task" });
      }
  
      // Return the documents array
      res.status(200).json({
        message: 'Documents fetched successfully',
        documents: task.documents
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  


  // router.get('/getLeadData/:leadId', async (req, res) => {
  //   try {
  //     const { leadId } = req.params;
  
  //     // Fetch lead document by leadId
  //     const leadRef = db.collection('leads').doc(leadId);
  //     const leadSnapshot = await leadRef.get();
  
  //     if (!leadSnapshot.exists) {
  //       return res.status(404).json({ error: 'Lead not found' });
  //     }
  
  //     const leadData = leadSnapshot.data();
  
     
  //     // Combine all data into a single response
  //     const fullLeadData = {
  //       ...leadData,
  //     };
  
  //     res.status(200).json(leadId);
  //   } catch (error) {
  //     console.error('Error fetching lead data:', error);
  //     res.status(500).json({ error: 'Internal Server Error' });
  //   }
  // });

  
module.exports = router;
