import express from 'express';
import multer from 'multer';
import { S3Storage } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 初始化 S3Storage
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 上传图片
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { note_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!note_id) {
      return res.status(400).json({ error: 'note_id is required' });
    }

    // 上传到对象存储
    const fileName = `pictures_from_users/${Date.now()}_${file.originalname}`;
    const imageKey = await storage.uploadFile({
      fileContent: file.buffer,
      fileName,
      contentType: file.mimetype,
    });

    // 生成1年后过期的签名URL
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    const imageUrl = await storage.generatePresignedUrl({
      key: imageKey,
      expireTime: oneYearInSeconds,
    });

    // 保存到数据库
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('pictures')
      .insert({ note_id: parseInt(note_id), image_key: imageKey })
      .select()
      .single();

    if (error) throw error;

    res.json({ ...data, image_url: imageUrl });
  } catch (error) {
    console.error('Upload picture error:', error);
    res.status(500).json({ error: 'Failed to upload picture' });
  }
});

// 获取笔记的所有图片
router.get('/note/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('pictures')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 为每张图片生成签名URL
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    const picturesWithUrls = await Promise.all(
      data.map(async (pic: { image_key: string; id: number; note_id: number; created_at: string }) => {
        const imageUrl = await storage.generatePresignedUrl({
          key: pic.image_key,
          expireTime: oneYearInSeconds,
        });
        return { ...pic, image_url: imageUrl };
      })
    );

    res.json(picturesWithUrls);
  } catch (error) {
    console.error('Get pictures error:', error);
    res.status(500).json({ error: 'Failed to get pictures' });
  }
});

// 删除图片
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const supabase = getSupabaseClient();
    // 获取图片信息
    const { data: picture, error: getError } = await supabase
      .from('pictures')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !picture) {
      return res.status(404).json({ error: 'Picture not found' });
    }

    // 从对象存储删除
    await storage.deleteFile({ fileKey: picture.image_key });

    // 从数据库删除
    const { error: deleteError } = await supabase
      .from('pictures')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ message: 'Picture deleted successfully' });
  } catch (error) {
    console.error('Delete picture error:', error);
    res.status(500).json({ error: 'Failed to delete picture' });
  }
});

export default router;
