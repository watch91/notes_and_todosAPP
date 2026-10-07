import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// 获取所有待办
router.get('/', async (req, res) => {
  try {
    const sort = (req.query.sort as string) || 'updated_at';
    // 限制允许的排序字段
    const sortField = sort === 'created_at' ? 'created_at' : 'updated_at';
    const client = getSupabaseClient();
    const { data, error } = await client.from('todos').select('*').order(sortField, { ascending: false });
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建待办
router.post('/', async (req, res) => {
  try {
    const { title, due_date } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    const client = getSupabaseClient();
    const insertData: Record<string, any> = { title, is_completed: false };
    if (due_date) insertData.due_date = due_date;
    const { data, error } = await client.from('todos').insert(insertData).select();
    if (error) throw new Error(`插入失败: ${error.message}`);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating todo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新待办
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, is_completed, due_date } = req.body;
    const client = getSupabaseClient();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (is_completed !== undefined) updates.is_completed = is_completed;
    if (due_date !== undefined) updates.due_date = due_date;
    
    const { data, error } = await client.from('todos')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }
    res.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('Error updating todo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除待办
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    const { error } = await client.from('todos').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    res.json({ success: true, message: 'Todo deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
