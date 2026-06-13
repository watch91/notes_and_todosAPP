import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// 搜索笔记（按标题模糊搜索）
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const client = getSupabaseClient();
    const { data, error } = await client.from('notes').select('*').ilike('title', `%${q}%`).order('updated_at', { ascending: false });
    if (error) throw new Error(`搜索失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error searching notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有笔记
router.get('/', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('notes').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个笔记
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    const { data, error } = await client.from('notes').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建笔记
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    const client = getSupabaseClient();
    const { data, error } = await client.from('notes').insert({ title, content: content || '' }).select();
    if (error) throw new Error(`插入失败: ${error.message}`);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新笔记
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const client = getSupabaseClient();
    const { data, error } = await client.from('notes')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    res.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('Error updating note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除笔记
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    const { error } = await client.from('notes').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
