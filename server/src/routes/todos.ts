import { Router } from 'express';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// 获取所有待办（按用户隔离）
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }
    
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个待办
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }
    
    const { id } = req.params;
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('todos')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return res.status(404).json({ success: false, error: '待办不存在' });
    }
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching todo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建待办
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }
    
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: '标题不能为空' });
    }
    
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('todos')
      .insert({ title, user_id: userId })
      .select();
    
    if (error) throw new Error(`创建失败: ${error.message}`);
    res.status(201).json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('Error creating todo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新待办
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }
    
    const { id } = req.params;
    const { title, is_completed } = req.body;
    const client = getSupabaseClient();
    
    // 先检查待办是否属于当前用户
    const { data: existing } = await client
      .from('todos')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (!existing) {
      return res.status(404).json({ success: false, error: '待办不存在或无权修改' });
    }
    
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (is_completed !== undefined) updateData.is_completed = is_completed;
    
    const { data, error } = await client
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select();
    
    if (error) throw new Error(`更新失败: ${error.message}`);
    res.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('Error updating todo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除待办
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }
    
    const { id } = req.params;
    const client = getSupabaseClient();
    
    // 先检查待办是否属于当前用户
    const { data: existing } = await client
      .from('todos')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (!existing) {
      return res.status(404).json({ success: false, error: '待办不存在或无权删除' });
    }
    
    const { error } = await client
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw new Error(`删除失败: ${error.message}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
