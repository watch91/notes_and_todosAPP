import express from 'express';
import multer from 'multer';
import { S3Storage } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const supabase = getSupabaseClient();

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 上传图片
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { note_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!note_id) {
      return res.status(400).json({ error: 'note_id is required' });
    }

    // 生成文件名
    const fileName = `pictures_from_users/${Date.now()}_${file.originalname}`;

    // 上传到对象存储
    const imageKey = await storage.uploadFile({
      fileContent: file.buffer,
      fileName,
      contentType: file.mimetype,
    });

    // 生成一年后过期的 URL
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    const imageUrl = await storage.generatePresignedUrl({
      key: imageKey,
      expireTime: oneYearInSeconds,
    });

    // 保存到数据库
    const { data, error } = await supabase
      .from('pictures')
      .insert({ note_id: parseInt(note_id), image_key: imageKey })
      .select()
      .single();

    if (error) {
      // 删除已上传的文件
      await storage.deleteFile({ fileKey: imageKey });
      throw error;
    }

    res.json({
      id: data.id,
      note_id: data.note_id,
      image_key: data.image_key,
      image_url: imageUrl,
      created_at: data.created_at,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// 获取笔记的所有图片
router.get('/note/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;

    const { data, error } = await supabase
      .from('pictures')
      .select('*')
      .eq('note_id', parseInt(noteId))
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 生成 URL
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    const pictures = await Promise.all(
      data.map(async (pic: { id: number; note_id: number; image_key: string; created_at: string }) => {
        const image_url = await storage.generatePresignedUrl({
          key: pic.image_key,
          expireTime: oneYearInSeconds,
        });
        return {
          id: pic.id,
          note_id: pic.note_id,
          image_key: pic.image_key,
          image_url,
          created_at: pic.created_at,
        };
      })
    );

    res.json(pictures);
  } catch (error) {
    console.error('Get pictures error:', error);
    res.status(500).json({ error: 'Failed to get pictures' });
  }
});

// 删除图片
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取图片信息
    const { data: picture, error: getError } = await supabase
      .from('pictures')
      .select('*')
      .eq('id', parseInt(id))
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
      .eq('id', parseInt(id));

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete picture error:', error);
    res.status(500).json({ error: 'Failed to delete picture' });
  }
});

export default router;
