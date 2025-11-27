const express = require('express');
const multer = require('multer');
const { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure S3 client for Hetzner
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'https://your-bucket-name.your-region.hetzner.cloud',
  region: process.env.S3_REGION || 'nbg1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for Hetzner
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// API: List objects in bucket
app.get('/api/list', async (req, res) => {
  try {
    const prefix = req.query.prefix || '';
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: '/',
    });

    const response = await s3Client.send(command);
    
    const folders = (response.CommonPrefixes || []).map(commonPrefix => {
      const folderPath = commonPrefix.Prefix;
      const folderName = folderPath.replace(prefix, '').replace(/\/$/, '');
      return {
        name: folderName || folderPath.split('/').filter(p => p).pop() || 'Unknown',
        path: folderPath,
        type: 'folder',
        size: null,
        lastModified: null,
      };
    });

    const files = (response.Contents || [])
      .filter(item => item.Key !== prefix) // Exclude the prefix itself if it's a folder
      .map(item => ({
        name: item.Key.split('/').pop(),
        path: item.Key,
        type: 'file',
        size: item.Size,
        lastModified: item.LastModified,
      }));

    res.json({
      folders,
      files,
      prefix: prefix,
    });
  } catch (error) {
    console.error('Error listing objects:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get download URL for a file
app.get('/api/download', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ error: 'Key parameter is required' });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get file info
app.get('/api/info', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ error: 'Key parameter is required' });
    }

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    res.json({
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      etag: response.ETag,
    });
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const prefix = req.body.prefix || '';
    const fileName = req.body.fileName || req.file.originalname;
    const key = prefix + fileName;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3Client.send(command);
    res.json({ success: true, key });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete file
app.delete('/api/delete', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ error: 'Key parameter is required' });
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete folder (delete all objects with prefix)
app.delete('/api/delete-folder', async (req, res) => {
  try {
    const prefix = req.query.prefix;
    if (!prefix) {
      return res.status(400).json({ error: 'Prefix parameter is required' });
    }

    // List all objects with the prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    if (objects.length === 0) {
      return res.json({ success: true, deleted: 0 });
    }

    // Delete all objects
    const deletePromises = objects.map(obj => {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: obj.Key,
      });
      return s3Client.send(deleteCommand);
    });

    await Promise.all(deletePromises);
    res.json({ success: true, deleted: objects.length });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 S3 Browser running on http://localhost:${PORT}`);
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
});

