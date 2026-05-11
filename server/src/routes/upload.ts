import { Router } from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { S3Storage } from 'coze-coding-dev-sdk';
import multer from 'multer';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// 配置 multer 接收内存中的文件
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
});

// 认证中间件
const authenticate = (req: Request): number | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
};

// 上传图片
router.post('/image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req);
    if (!userId) {
      return res.status(401).json({ error: '请先登录' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' });
    }

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: req.file.buffer,
      fileName: `notes/${userId}/${Date.now()}_${req.file.originalname}`,
      contentType: req.file.mimetype,
    });

    // 生成签名 URL（有效期7天）
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 7 * 24 * 60 * 60,
    });

    res.json({
      url: signedUrl,
      key: fileKey
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

export default router;
