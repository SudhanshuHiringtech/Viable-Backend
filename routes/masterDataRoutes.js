

const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
//const serviceAccount = require("../serviceAccount.json");
const saltedMd5 = require('salted-md5');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const formidable = require('formidable');

const estorage = admin.storage().bucket();
const db = admin.firestore();

const router = express.Router();

// Multer setup with memory storage and file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});


// const uploadFiles = upload.fields([
//   { name: 'tenderDocuments', maxCount: 10 },
//   { name: 'additionalDocuments', maxCount: 10 },
//   //{ name: 'personDocuments', maxCount: 5 }
// ]);


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

router.post('/company-data', upload.array('files'), async (req, res) => {
    try {
      const data = JSON.parse(req.body.data);
      const { documentName, ExpiryDate } = data;
  
      if (!documentName) {
        return res.status(400).json({ error: "Document Name is required" });
      }
  
      // Check for duplicate documentName in the entire collection
      const companyDataSnapshot = await db.collection('CompanyPersonalData').get();
  
      let duplicateFound = false;
  
      companyDataSnapshot.forEach(doc => {
        const companyData = doc.data();
  
        if (companyData && companyData.documentName === documentName) {
          duplicateFound = true;
        }
      });
  
      if (duplicateFound) {
        return res.status(400).json({ error: "Document with this name already exists" });
      }
  
      // Create a new document reference without setting data yet
      let companyDataDoc = db.collection('CompanyPersonalData').doc();
      let documentId = companyDataDoc.id; // Get the generated document ID
  
      const assignedDate = new Date().toISOString();
  
      // Create the companyPersonalData object
      const companyPersonalData = {
        documentId,  // Add the documentId to the JSON data
        documentName,
        documents: [],
        assignedDate,
      };
  
      // Add ExpiryDate only if it's provided
      if (ExpiryDate) {
        companyPersonalData.ExpiryDate = ExpiryDate;
      }
  
      for (const document of req.files) {
        const storagePath = `documents/${documentId}/${document.originalname}`;
        const file = estorage.file(storagePath);
        await file.save(document.buffer, { contentType: document.mimetype });
  
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491'
        });
  
        companyPersonalData.documents.push({
          documentName: document.originalname,
          url,
          storagePath
        });
      }
  
      // Store companyPersonalData directly without an array
      await companyDataDoc.set(companyPersonalData);
  
      res.status(200).json({
        message: 'Task assigned successfully',
        companyPersonalData
      });
    } catch (error) {
      console.error('Error assigning:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
  

  router.put('/updatecompany-data/:id', upload.array('files'), async (req, res) => {
    try {
      const { id } = req.params;
      const data = JSON.parse(req.body.data);
      const { documentName, ExpiryDate } = data;
  
      if (!documentName) {
        return res.status(400).json({ error: "Document Name is required" });
      }
  
      const companyDataRef = db.collection('CompanyPersonalData').doc(id);
      const companyDataDoc = await companyDataRef.get();
  
      if (!companyDataDoc.exists) {
        return res.status(404).json({ error: "Document not found" });
      }
  
      let companyData = companyDataDoc.data();
      let companyPersonalData = companyData.CampanyData.find(item => item.documentId === id);
  
      if (!companyPersonalData) {
        return res.status(404).json({ error: "No matching company data found" });
      }
  
      companyPersonalData.documentName = documentName || companyPersonalData.documentName;
      companyPersonalData.ExpiryDate = ExpiryDate || companyPersonalData.ExpiryDate;
      companyPersonalData.assignedDate = new Date().toISOString();
  
      if (req.files && req.files.length > 0) {
        for (const document of req.files) {
          const storagePath = `documents/${id}/${document.originalname}`;
          const file = estorage.file(storagePath);
          await file.save(document.buffer, { contentType: document.mimetype });
  
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
          });
  
          companyPersonalData.documents.push({
            documentName: document.originalname,
            url,
            storagePath
          });
        }
      }
  
      await companyDataRef.update({ CampanyData: companyData.CampanyData });
  
      res.status(200).json({
        message: 'Company data updated successfully',
        Id: id,
        companyPersonalData
      });
    } catch (error) {
      console.error('Error updating company data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  


  // GET API to retrieve all company data
router.get('/access-company-data', async (req, res) => {
    try {
      const companyDataSnapshot = await db.collection('CompanyPersonalData').get();
      
      if (companyDataSnapshot.empty) {
        return res.status(404).json({ message: "No company data found" });
      }
  
      let allCompanyData = [];
      companyDataSnapshot.forEach(doc => {
        const docData = doc.data();
        allCompanyData.push({
          documentId: doc.id,
          ...docData
        });
      });
  
      res.status(200).json(allCompanyData);
    } catch (error) {
      console.error('Error fetching company data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  module.exports = router;
