

const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const saltedMd5=require('salted-md5');
const path=require('path');
const { v4: uuidv4 } = require('uuid');
const formidable = require('formidable');

const estorage = admin.storage().bucket();
const db = admin.firestore();



const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });
const assigntask = multer({storage: multer.memoryStorage()})


router.post('/upload',upload.single('file'),async(req,res)=>{
  const name = saltedMd5(req.file.originalname, 'SUPER-S@LT!')
  const fileName = name + path.extname(req.file.originalname)
  await estorage.file(fileName).createWriteStream().end(req.file.buffer)
  res.send('done');
})

router.get('/good', async (req, res) => {
   
  const data = {
    message: 'Hello, this is your API data!',
    timestamp: new Date()
  };
  res.json(data);
})

router.post('/assigntask', upload.array('files'), async (req, res) => {
  try {
    const { status, taskDetails, employeeId, employeeName } = req.body;
    console.log("Request", req.body)

    const taskId = db.collection("tasks").doc().id;
    console.log("tserId", taskId);
    const jsonData = {
      status,
      taskDetails,
      employeeId,
      taskId,
      employeeName
    }
    console.log("fsz", jsonData);
    documents = req.files;
    console.log("Documents: ", documents);
    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required" });
    }


    const taskRef = await admin.firestore().collection('tasks').add(jsonData);

    const documentUrls = [];
    for (const document of documents) {
      const storagePath = `documents/${taskRef.id}/${document.originalname}`;
      const file = estorage.file(storagePath);
      await file.save(document.buffer, { contentType: document.mimetype });
      const url = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // adjust expiration date as needed
      });
      documentUrls.push({ name: document.originalname, url: url[0], storagePath: storagePath });
    }
    console.log("document", documentUrls)
    console.log("task", taskRef)
    await taskRef.update({
      documentUrls: documentUrls
    });

    res.status(200).json({
      message: 'Task assigned successfully',
      taskId: taskRef.id,
      employeeId,
      taskDetails,
      employeeName,
      documentUrls
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/updatetask', upload.array('files'), async (req, res) => {
  try {
    console.log("Request", req.body);
    const { status, taskId } = req.body;
    console.log("status", status);
    const jsonData = {
      status,
    };

    console.log("Task Data", jsonData);
    const documents = req.files;
    console.log("Documents: ", documents);

    let taskRef;
    let documentUrls = [];

    if (taskId) {
      // Update existing task
      taskRef = admin.firestore().collection('tasks').doc(taskId);

      // Fetch existing document URLs if any
      const taskDoc = await taskRef.get();
      if (taskDoc.exists) {
        const taskData = taskDoc.data();
        documentUrls = taskData.documentUrls || [];
      } else {
        return res.status(404).json({ error: "Task not found" });
      }

      // Update task details
      await taskRef.update(jsonData);
    } else {
      // Create new task
      taskRef = await admin.firestore().collection('tasks').add(jsonData);
    }

    // Handle file uploads
    for (const document of documents) {
      const storagePath = `documents/${taskRef.id}/${document.originalname}`;
      const file = estorage.file(storagePath);
      await file.save(document.buffer, { contentType: document.mimetype });
      const url = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // Adjust expiration date as needed
      });
      documentUrls.push({ name: document.originalname, url: url[0], storagePath: storagePath });
    }

    // Update Firestore document with new document URLs
    await taskRef.update({
      documentUrls: documentUrls
    });

    res.status(200).json({
      message: 'Task assigned/updated successfully',
      taskId: taskRef.id,
      documentUrls
    });
  } catch (error) {
    console.error('Error assigning/updating task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/search', (req, res) => {
  const { data, designation } = req.body; // Access data from request body
  console.log("Data:", data);
  console.log("Designation:", designation);
  
  // Check if designation is provided
  if (!designation) {
    return res.status(400).json({ error: 'Please provide a designation to search' });
  }

  // Assuming data is an array of objects
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Data should be an array' });
  }

  // Perform search based on the received designation
  const results = data.filter(item => item.designation === designation);

  res.json(results);
});

router.get('/tasks', async (req, res) => {
  try {
    // Fetch tasks from Firestore
    const tasksSnapshot = await db.collection('tasks').get();

    const tasks = [];
    // Iterate through tasks
    for (const doc of tasksSnapshot.docs) {
      const task = doc.data();
      task.id = doc.id; // Add document ID to the task object

      // Fetch associated documentUrls from Firestore
      const documentUrls = [];
      for (const docUrl of task.documentUrls || []) {
        const file = estorage.file(docUrl.storagePath);
        const url = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491' // adjust expiration date as per your requirement
        });
        documentUrls.push({ name: docUrl.name, url: url[0], storagePath: docUrl.storagePath });
      }

      task.documentUrls = documentUrls;
      tasks.push(task);
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;