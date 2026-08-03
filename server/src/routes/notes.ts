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
    
    // 获取所有笔记的创建者信息
    const userIds = [...new Set(data?.filter(n => n.user).map(n => n.user))];
    let userMap: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: users } = await client.from('users').select('user_id, user_name').in('user_id', userIds);
      if (users) {
        userMap = users.reduce((acc: Record<string, string>, u: any) => {
          acc[u.user_id] = u.user_name;
          return acc;
        }, {});
      }
    }
    
    // 添加创建者昵称到笔记数据
    const notesWithAuthor = data?.map(note => ({
      ...note,
      author_name: note.user ? (userMap[note.user] || '匿名用户') : '匿名用户'
    }));
    
    res.json({ success: true, data: notesWithAuthor });
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
    const { title, content, label_1, label_2, label_3 } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    const client = getSupabaseClient();
    const insertData: any = { title, content: content || '' };
    if (label_1 !== undefined) insertData.label_1 = label_1;
    if (label_2 !== undefined) insertData.label_2 = label_2;
    if (label_3 !== undefined) insertData.label_3 = label_3;
    if (userId) insertData.user = userId;
    
    const { data, error } = await client.from('notes').insert(insertData).select();
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
    const { title, content, label_1, label_2, label_3 } = req.body;
    const client = getSupabaseClient();
    const updateData: any = { title, content, updated_at: new Date().toISOString() };
    // 标签字段：允许设置为 null 或整数
    if (label_1 !== undefined) updateData.label_1 = label_1;
    if (label_2 !== undefined) updateData.label_2 = label_2;
    if (label_3 !== undefined) updateData.label_3 = label_3;
    const { data, error } = await client.from('notes')
      .update(updateData)
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
