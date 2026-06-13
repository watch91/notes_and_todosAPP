import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const router = Router();

// 初始化 S3 客户端
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.COBE_BUCKET_ENDPOINT_URL || 'https://integration.coze.cn/coze-coding-s3proxy/v1',
  credentials: {
    accessKeyId: process.env.COBE_BUCKET_ACCESS_KEY || '',
    secretAccessKey: process.env.COBE_BUCKET_SECRET_KEY || '',
  },
});

const BUCKET_NAME = process.env.COBE_BUCKET_NAME || 'bucket_1778337874301';

// 图片上传接口
router.post('/', async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: '请上传图片文件' });
    }

    // 生成唯一文件名
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `notes/${randomUUID()}.${ext}`;

    // 上传到 S3
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    // 返回公网 URL
    const url = `${process.env.COBE_BUCKET_ENDPOINT_URL}/${BUCKET_NAME}/${fileName}`;

    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

export default router;
