import { Router } from 'express';
import { S3Storage } from 'coze-coding-dev-sdk';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `notes/${Date.now()}.${ext}`;

    const key = await storage.uploadFile({
      fileContent: req.file.buffer,
      fileName,
      contentType: req.file.mimetype,
    });

    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 30,
    });

    res.json({ url, key });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
