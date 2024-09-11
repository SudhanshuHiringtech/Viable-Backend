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

// // Upload route
// router.post('/upload', upload.single('file'), async (req, res) => {
//   try {
//     const name = saltedMd5(req.file.originalname, 'SUPER-S@LT!');
//     const fileName = name + path.extname(req.file.originalname);

//     // Upload the file to Firebase Storage
//     const file = estorage.file(fileName);
//     const writeStream = file.createWriteStream({
//       metadata: {
//         contentType: req.file.mimetype // Set the MIME type
//       }
//     });
//     console.log('File MIME Type:', req.file.mimetype); 

//     // Write the file buffer to the stream
//     writeStream.on('error', (error) => {
//       console.error('Upload error:', error);
//       res.status(500).json({ error: 'Failed to upload file' });
//     });

//     writeStream.on('finish', () => {
//       res.status(200).send('File uploaded successfully');
//     });

//     // Pipe the file buffer into the write stream
//     writeStream.end(req.file.buffer);

//   } catch (error) {
//     console.error('Upload error:', error);
//     res.status(500).json({ error: 'Failed to upload file' });
//   }
// });

router.post('/get-lead', async (req, res) => {
  try {
    const { role, employeeId } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

// Handle case for Employee
if (role === 'Employee') {
  if (!employeeId) {
    return res.status(400).json({ error: "Employee ID is required for employees" });
  }

  // Query Firestore to find leads containing tasks for the given employeeId
  const leadsRef = db.collection('leads');
  const leadQuerySnapshot = await leadsRef.get();

  if (leadQuerySnapshot.empty) {
    return res.status(404).json({ message: "No tasks found for this employee" });
  }

  // Initialize an array to accumulate tasks with lead information
  let allFoundTasks = [];

  leadQuerySnapshot.forEach(doc => {
    const leadData = doc.data();
    const leadId = leadData.leadId;
    const department = leadData.department;
    const location = leadData.location;
    const tasks = leadData.tasks;

    // Filter tasks specific to the employeeId and include lead information
    const foundTasks = tasks
      .filter(task => task.employeeId === employeeId)
      .map(task => ({
        ...task,
        leadId,
        department,
        location
      }));

    // Accumulate found tasks
    allFoundTasks = allFoundTasks.concat(foundTasks);
  });

  if (allFoundTasks.length === 0) {
    return res.status(404).json({ message: "No tasks found for this employee" });
  }

  return res.status(200).json({
    message: 'Tasks retrieved successfully',
    tasks: allFoundTasks
  });
}


    // Handle case for Owner
    if (role === 'Owner') {
      const leadsRef = db.collection('leads');
      const leadsQuerySnapshot = await leadsRef.get();

      if (leadsQuerySnapshot.empty) {
        return res.status(404).json({ message: "No leads found" });
      }

      const leads = leadsQuerySnapshot.docs.map(doc => ({
        leadId: doc.id,
        ...doc.data()
      }));

      return res.status(200).json({
        message: 'All leads retrieved successfully',
        leads
      });
    }

    // Handle case where role is neither 'Employee' nor 'Owner'
    return res.status(403).json({ error: 'Access denied. Invalid role provided.' });

  } catch (error) {
    console.error('Error retrieving tasks:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.post('/assigntask', upload.array('files'), async (req, res) => {
  try {
    console.log(req.body.data)
    const data = JSON.parse(req.body.data);
    const {department, location, employeeId, employeeName, leadStatus } = data;

    if (!employeeId) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    // Check if a lead with the given employeeId already exists
    const leadsRef = db.collection('leads');
    const leadQuery = await leadsRef.where('tasks.employeeId', '==', employeeId).limit(1).get();

    let leadData;
    let leadRef;

    if (!leadQuery.empty) {
      // Use the existing lead
      leadRef = leadQuery.docs[0].ref;
      leadData = leadQuery.docs[0].data();
    } else {
      // Create a new lead
      leadRef = db.collection('leads').doc(); // Generate a new document reference
      leadData = { leadId: leadRef.id, department, location, tasks: [], history: [] };
    }

    const existingTaskQuery = leadData.tasks.find(task => 
      task.employeeId === employeeId && task.taskDetails === taskDetails && task.leadStatus === leadStatus
    );

    if (existingTaskQuery) {
      return res.status(200).json({ message: 'Task already exists' });
    }

    const taskId = db.collection('tasks').doc().id;
    const assignedDate = new Date().toISOString();

    const taskData = {
      taskId,
      employeeId,
      employeeName,
      taskCondition : 'Assigned',
      phase : 1,
      leadStatus,
      documents: [],
      assignedDate,
      completedDate: null,

    };

    for (const document of req.files) {
      const storagePath = `documents/${taskId}/${document.originalname}`;
      const file = estorage.file(storagePath);
      await file.save(document.buffer, { contentType: document.mimetype });

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      });

      taskData.documents.push({ 
        documentName: document.originalname, 
        url, 
        storagePath 
      });
    }

    leadData.tasks.push(taskData);

    await leadRef.set(leadData);
    
    res.status(200).json({
      message: 'Task assigned successfully',
      leadId: leadData.leadId,
      taskData
    });
    await notifyWorkAssignment(employeeId, department);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/reassignTask', async (req, res) => {
  try {
    const { leadId, newEmployeeId, newEmployeeName, phase } = req.body;
    console.log(req.body)
    if (!leadId || !newEmployeeId || !newEmployeeName) {
      return res.status(400).json({ error: "leadId, newEmployeeId, and newEmployeeName are required" });
    }

    // Fetch the lead data
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnapshot = await leadRef.get();

    if (!leadSnapshot.exists) {
      return res.status(404).json({ error: "Lead not found" });
    }

    let leadData = leadSnapshot.data();
  
    // Set the phase to 2 and task condition to 'Assigned'
    const newTaskId = db.collection('tasks').doc().id;
    const assignedDate = new Date().toISOString();

    const newTaskData = {
      taskId: newTaskId,
      employeeId: newEmployeeId,
      employeeName: newEmployeeName,
      taskCondition: 'Assigned', // Task condition is 'Assigned'
      phase: phase,// Set the phase to 2
      assignedDate,
      completedDate: null,
      status: 'Assigned'
    };

    leadData.tasks.push(newTaskData);

    // Update the lead with the new task
    await leadRef.set(leadData);

    res.status(200).json({
      message: 'Task reassigned successfully',
      leadId,
      taskData: newTaskData
    });
    await notifyWorkAssignment(employeeId, departmentName);
  } catch (error) {
    console.error('Error reassigning task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/employeeUpdateLead', upload.array('files'), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const { leadId, employeeId, taskDetailsUpdate, leadStatus, address, rejectORaccept, tenderNumber, departmentName, ProductName, openingDate, closingDate, portalName, leadMode } = data;
    console.log(data);
    // Validate the input
    if (!leadId || !employeeId) {
      return res.status(400).json({ error: "leadId and employeeId are required" });
    }

    // Fetch the lead data
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnapshot = await leadRef.get();

    if (!leadSnapshot.exists) {
      return res.status(404).json({ error: "Lead not found" });
    }

    let leadData = leadSnapshot.data();
    const taskIndex = leadData.tasks.findIndex(task => task.employeeId === employeeId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task for the given employee not found" });
    }

    // Retrieve the task data
    let taskData = leadData.tasks[taskIndex];

    // Update task details if provided
    if (taskDetailsUpdate) {
      taskData.taskDetails = taskDetailsUpdate;
    }
    if (departmentName) {
      taskData.departmentName = departmentName;
    }
    if (ProductName) {
      taskData.ProductName = ProductName;
    }

    if(rejectORaccept){
      taskData.rejectORaccept = rejectORaccept;
    }
    if(portalName){
      taskData.portalName = portalName;
    }
    // Update lead status if provided
    if (leadStatus) {
      taskData.leadStatus = leadStatus;
    }
    if (leadMode) {
      taskData.leadMode = leadMode;
    }

    // Update address or tender number if provided
    if (address) {
      taskData.address = address;
    }
    if (tenderNumber) {
      taskData.tenderNumber = tenderNumber;
    }
    if (openingDate) {
      taskData.openingDate = openingDate;
    }
    if (closingDate) { 
      taskData.closingDate = closingDate;
    }
   
    taskData.taskCondition = 'Received';
    taskData.reject = 0;

    // Upload new documents if provided
    for (const document of req.files) {
      const storagePath = `documents/${taskData.taskId}/${document.originalname}`;
      const file = estorage.file(storagePath);
      await file.save(document.buffer, { contentType: document.mimetype });

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      });

      taskData.documents.push({ 
        documentName: document.originalname, 
        url, 
        storagePath 
      });
    }

    // Save the updated task data back to the lead
    leadData.tasks[taskIndex] = taskData;
    await leadRef.set(leadData);

    // Send the response back to the client
    res.status(200).json({
      message: 'Task updated successfully',
      leadId,
      taskData
    });
    const ownerId = 'zeozcVW1P2RloarbiOvw'
    await notifyWorkCompletion(ownerId, taskData.department);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// API for uploading Tender and Additional Documents with extra fields
router.post('/employeeUpdateLead-2', uploadFiles, async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const { leadId, taskId, employeeId,  leadStatus, TenderFeePayment, EWDpayment, PaymentMode, rejectORaccept, description } = data;

    if (!leadId || !employeeId) {
      return res.status(400).json({ error: "leadId and employeeId are required" });
    }

    // Fetch the lead data
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnapshot = await leadRef.get();

    if (!leadSnapshot.exists) {
      return res.status(404).json({ error: "Lead not found" });
    }

    let leadData = leadSnapshot.data();
    const taskIndex = leadData.tasks.findIndex(task => task.taskId === taskId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task for the given employee not found" });
    }

    // Retrieve the task data
    let taskData = leadData.tasks[taskIndex];
    console.log(taskData);
    // Update task details if provided

        // Initialize the documents array if it doesn't exist
    if (!taskData.documents) {
          taskData.documents = [];
    }

    if (leadStatus) {
      taskData.leadStatus = leadStatus;
    }
    if (TenderFeePayment) {
      taskData.TenderFeePayment = TenderFeePayment;
    }
    if (EWDpayment) {
      taskData.EWDpayment = EWDpayment;
    }
    if (PaymentMode) {
      taskData.PaymentMode = PaymentMode;
    }
    if(rejectORaccept) {
      taskData.rejectORaccept = rejectORaccept;
    }
    if(description) {
      taskData.description =  description;
    }
    taskData.taskCondition = 'Received';
    taskData.reject = 0;

    // Handle document uploads
    const handleDocumentUpload = async (documents, folderName) => {
      for (const document of documents) {
        const name = saltedMd5(document.originalname, 'SUPER-S@LT!');
        const fileName = name + path.extname(document.originalname);
        const storagePath = `${folderName}/${taskData.taskId}/${fileName}`;
        const file = estorage.file(storagePath);
        await file.save(document.buffer, { contentType: document.mimetype });

        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491'
        });

        taskData.documents.push({
          documentName: document.originalname,
          url,
          storagePath,
          documentType: folderName
        });

        if (folderName === 'poFile') {
          await db.collection('poFiles').add({
            documentName: document.originalname,
            url,
            storagePath,
            uploadedAt: new Date(),
            employeeId
          });
        }
      }
    };

    // Upload Tender Documents
    if (req.files.tenderDocuments) {
      await handleDocumentUpload(req.files.tenderDocuments, 'TenderDocuments');
    }

    // Upload Additional Documents
    if (req.files.additionalDocuments) {
      await handleDocumentUpload(req.files.additionalDocuments, 'AdditionalDocuments');
    }

     // Upload PaymentRecipt Documents
     if (req.files.paymentRecipt) {
      await handleDocumentUpload(req.files.paymentRecipt, 'paymentRecipt');
    }

    if (req.files.poFile) {
      await handleDocumentUpload(req.files.poFile, 'poFile');
    }

    // Save the updated task data back to the lead
    leadData.tasks[taskIndex] = taskData;
    await leadRef.set(leadData);

    res.status(200).json({
      message: 'Task updated successfully with documents',
      leadId,
      taskData
    });
    const ownerId = 'zeozcVW1P2RloarbiOvw'
    await notifyWorkCompletion(ownerId, taskData.department);
  } catch (error) {
    console.error('Error updating task with documents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/getPoFiles', async (req, res) => {
  try {
    // Fetch all poFiles
    const poFilesSnapshot = await db.collection('poFiles').get();

    if (poFilesSnapshot.empty) {
      return res.status(404).json({ error: "No poFiles found" });
    }

    const poFiles = poFilesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      message: 'PoFiles fetched successfully',
      poFiles
    });
  } catch (error) {
    console.error('Error fetching poFiles:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// // Update task route
// router.post('/updatetask', upload.array('files'), async (req, res) => {
//   try {
//     const { status, taskId } = req.body;
//     const jsonData = { status };
//     let taskRef;
//     let documentUrls = [];

//     if (taskId) {
//       taskRef = db.collection('tasks').doc(taskId);
//       const taskDoc = await taskRef.get();
//       if (taskDoc.exists) {
//         const taskData = taskDoc.data();
//         documentUrls = taskData.documentUrls || [];
//       } else {
//         return res.status(404).json({ error: "Task not found" });
//       }
//       await taskRef.update(jsonData);
//     } else {
//       taskRef = await db.collection('tasks').add(jsonData);
//     }

//     for (const document of req.files) {
//       const storagePath = `documents/${taskRef.id}/${document.originalname}`;
//       const file = estorage.file(storagePath);
//       await file.save(document.buffer, { contentType: document.mimetype });
//       const url = await file.getSignedUrl({
//         action: 'read',
//         expires: '03-09-2491' // Adjust expiration date as needed
//       });
//       documentUrls.push({ name: document.originalname, url: url[0], storagePath });
//     }

//     await taskRef.update({ documentUrls });

//     if (status === 'Done') {
//       const taskData = (await taskRef.get()).data();
//       await db.collection('History').add(taskData);
//       await taskRef.delete();
//     }

//     res.status(200).json({
//       message: 'Task assigned/updated successfully',
//       taskId: taskRef.id,
//       documentUrls
//     });
//   } catch (error) {
//     console.error('Error assigning/updating task:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


router.post('/declineTask', async (req, res) => {
  try {
    const { taskId, leadId, employeeId, declineReason, phase,  } = req.body;

    // Validate the input
    console.log(req.body)
    if (!leadId || !taskId) {
      return res.status(400).json({ error: "leadId and  taskId are required" });
    }

    // Fetch the lead data
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnapshot = await leadRef.get();

    if (!leadSnapshot.exists) {
      return res.status(404).json({ error: "Lead not found" });
    }

    let leadData = leadSnapshot.data();
    const taskIndex = leadData.tasks.findIndex(task => task.taskId === taskId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task for the given employee not found" });
    }

    // Retrieve the task data
    let taskData = leadData.tasks[taskIndex];

    // Update task condition to 'Declined' and set phase to 1
    taskData.taskCondition = 'Declined';
    taskData.phase = phase;

    // Include decline reason if provided
    if (declineReason) {
      taskData.declineReason = declineReason;
    }
    // Save the updated task data back to the lead
    leadData.tasks[taskIndex] = taskData;
    await leadRef.set(leadData);

    // Send the response back to the client
    res.status(200).json({
      message: 'Task declined successfully',
      leadId,
      taskData
    });
  } catch (error) {
    console.error('Error declining task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





router.post('/verifiedTask', async (req, res) => {
  try {
    const { taskId, leadId, phase, rejectORaccept } = req.body;

    // Validate the input
    console.log(req.body)
    if (!leadId || !taskId) {
      return res.status(400).json({ error: "leadId and taskId are required" });
    }

    // Fetch the lead data
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnapshot = await leadRef.get();

    if (!leadSnapshot.exists) {
      return res.status(404).json({ error: "Lead not found" });
    }

    let leadData = leadSnapshot.data();
    const taskIndex = leadData.tasks.findIndex(task => task.taskId === taskId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task for the given employee not found" });
    }
     console.log(taskIndex)
    // Retrieve the task data
    let taskData = leadData.tasks[taskIndex];

    // Update the rejectORaccept field and the Phase
    taskData.rejectORaccept = rejectORaccept;
    taskData.phase = phase;
    taskData.taskCondition =  'Done';

    // Save the updated task data back to the lead
    leadData.tasks[taskIndex] = taskData;
    await leadRef.set(leadData);

    // If rejectORaccept is true, copy the task to the history collection
    if (rejectORaccept === true) {
      const historyRef = db.collection('history').doc();
      await historyRef.set({
        leadId: leadId,
        taskId: taskId,
        taskData: taskData,
        timestamp: new Date().toISOString()
      });
    }

    // Send the response back to the client
    res.status(200).json({
      message: 'Task processed successfully',
      leadId,
      taskData
    });
  } catch (error) {
    console.error('Error processing task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Get history route
router.get('/getHistory', async (req, res) => {
  try {
    const historySnapshot = await db.collection('history').get();
    
    if (historySnapshot.empty) {
      return res.status(404).json({ message: 'No history data found' });
    }

    const historyData = [];
    historySnapshot.forEach(doc => {
      historyData.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({ history: historyData });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;
