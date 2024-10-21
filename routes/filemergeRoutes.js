const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");

const saltedMd5 = require('salted-md5');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const formidable = require('formidable');

const estorage = admin.storage().bucket();
const db = admin.firestore();
const { PDFDocument } = require("pdf-lib");

const router = express.Router();

const { notifyWorkAssignment, notifyWorkCompletion,  } = require('./notification');

// Multer setup with memory storage and file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});



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

// Helper function to download files from Firebase
async function downloadFile(fileName) {
    const [fileBuffer] = await estorage.file(fileName).download();
    return fileBuffer;
  }
  
  // Helper function to generate a signed URL for accessing merged PDF
  async function getSignedUrl(fileName) {
    const options = {
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1-hour expiration
    };
    const [url] = await estorage.file(fileName).getSignedUrl(options);
    return url;
  }
  
  // Route to merge PDF files
  router.post("/mergePdfs", async (req, res) => {
    try {
      const { fileNames } = req.body; // Array of file names stored in Firebase
      const pdfDocs = [];
  
      // Download all files from Firebase Storage
      for (const name of fileNames) {
        const fileBuffer = await downloadFile(name);
        const pdfDoc = await PDFDocument.load(fileBuffer);
        pdfDocs.push(pdfDoc);
      }
  
      // Create a new PDF and copy all pages from the uploaded PDFs
      const mergedPdf = await PDFDocument.create();
      for (const pdfDoc of pdfDocs) {
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
  
      const mergedPdfBytes = await mergedPdf.save();
  
      // Save the merged PDF to Firebase Storage
      const mergedFileName = `merged/${uuidv4()}.pdf`;
      const file = estorage.file(mergedFileName);
      const stream = file.createWriteStream();
  
      stream.end(mergedPdfBytes);
  
      // Wait for the stream to finish uploading
      stream.on("finish", async () => {
        // Generate a signed URL to access the merged PDF
        const url = await getSignedUrl(mergedFileName);
        res.status(200).json({ message: "PDFs merged successfully", url });
      });
  
      stream.on("error", (error) => {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to upload merged PDF" });
      });
    } catch (error) {
      console.error("Error merging PDFs:", error);
      res.status(500).json({ error: "Failed to merge PDFs" });
    }
  });
  
  module.exports = router;
