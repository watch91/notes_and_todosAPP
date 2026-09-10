import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// 辅助函数：将时间字段规范化为带 UTC 时区的 ISO 格式
function normalizeTimestamps<T extends Record<string, any>>(item: T): T {
  if (item && typeof item === 'object') {
    const result = { ...item };
    if (result.created_at) {
      result.created_at = new Date(result.created_at).toISOString();
    }
    if (result.updated_at) {
      result.updated_at = new Date(result.updated_at).toISOString();
    }
    return result;
  }
  return item;
}

function normalizeNotesTimestamps(data: any[] | null | undefined): any[] | null {
  if (!data) return data;
  return data.map(item => normalizeTimestamps(item));
}

// 搜索笔记（按标题模糊搜索）
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const client = getSupabaseClient();
    const { data, error } = await client.from('notes').select('*').ilike('title', `%${q}%`).order('updated_at', { ascending: false });
    if (error) throw new Error(`搜索失败: ${error.message}`);
    res.json({ success: true, data: normalizeNotesTimestamps(data) });
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
    
    // 添加创建者昵称和协作者数量到笔记数据
    const notesWithAuthor = normalizeNotesTimestamps(data)?.map(note => {
      let collaboratorCount = 0;
      try {
        const collabIds = JSON.parse(note.collaborators || '[]');
        collaboratorCount = collabIds.length;
      } catch {
        collaboratorCount = 0;
      }
      return {
        ...note,
        author_name: note.user ? (userMap[note.user] || '匿名用户') : '匿名用户',
        collaborator_count: collaboratorCount
      };
    });
    
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
    
    // 解析协作者 ID 列表
    let collaboratorIds: string[] = [];
    try {
      collaboratorIds = JSON.parse(data.collaborators || '[]');
    } catch {
      collaboratorIds = [];
    }
    
    // 获取协作者详细信息
    let collaborators: { user_id: string; user_name: string }[] = [];
    if (collaboratorIds.length > 0) {
      const { data: users } = await client.from('users').select('user_id, user_name').in('user_id', collaboratorIds);
      collaborators = users || [];
    }
    
    // 获取作者昵称
    let author_name = null;
    if (data.user) {
      const { data: authorData } = await client.from('users').select('user_name').eq('user_id', data.user).maybeSingle();
      author_name = authorData?.user_name || null;
    }
    
    res.json({ success: true, data: normalizeTimestamps({ ...data, collaborators, author_name }) });
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
    res.status(201).json({ success: true, data: normalizeNotesTimestamps(data) });
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
    res.json({ success: true, data: normalizeNotesTimestamps(data)?.[0] });
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

// 获取笔记的协作者列表
router.get('/:id/collaborators', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    
    // 获取笔记信息
    const { data: note, error: noteError } = await client.from('notes').select('collaborators').eq('id', id).maybeSingle();
    if (noteError) throw new Error(`查询失败: ${noteError.message}`);
    if (!note) return res.status(404).json({ success: false, error: 'Note not found' });
    
    // 解析协作者 ID 列表
    let collaboratorIds: string[] = [];
    try {
      collaboratorIds = JSON.parse(note.collaborators || '[]');
    } catch {
      collaboratorIds = [];
    }
    
    // 获取协作者详细信息
    if (collaboratorIds.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const { data: users, error: usersError } = await client.from('users').select('user_id, user_name').in('user_id', collaboratorIds);
    if (usersError) throw new Error(`查询用户失败: ${usersError.message}`);
    
    res.json({ success: true, data: users || [] });
  } catch (error: any) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加协作者
router.post('/:id/collaborators', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const currentUserId = req.headers['x-user-id'] as string;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    
    const client = getSupabaseClient();
    
    // 获取笔记信息
    const { data: note, error: noteError } = await client.from('notes').select('user, collaborators').eq('id', id).maybeSingle();
    if (noteError) throw new Error(`查询失败: ${noteError.message}`);
    if (!note) return res.status(404).json({ success: false, error: 'Note not found' });
    
    // 检查是否是作者（只有作者可以添加协作者）
    if (note.user !== currentUserId) {
      return res.status(403).json({ success: false, error: '只有笔记作者可以添加协作者' });
    }
    
    // 解析现有协作者
    let collaboratorIds: string[] = [];
    try {
      collaboratorIds = JSON.parse(note.collaborators || '[]');
    } catch {
      collaboratorIds = [];
    }
    
    // 检查是否已经是协作者
    if (collaboratorIds.includes(user_id)) {
      return res.status(400).json({ success: false, error: '该用户已经是协作者' });
    }
    
    // 不能添加作者自己
    if (user_id === note.user) {
      return res.status(400).json({ success: false, error: '不能添加笔记作者为协作者' });
    }
    
    // 添加协作者
    collaboratorIds.push(user_id);
    
    const { data, error } = await client.from('notes')
      .update({ collaborators: JSON.stringify(collaboratorIds) })
      .eq('id', id)
      .select();
    
    if (error) throw new Error(`更新失败: ${error.message}`);
    
    res.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除协作者
router.delete('/:id/collaborators/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.headers['x-user-id'] as string;
    
    const client = getSupabaseClient();
    
    // 获取笔记信息
    const { data: note, error: noteError } = await client.from('notes').select('user, collaborators').eq('id', id).maybeSingle();
    if (noteError) throw new Error(`查询失败: ${noteError.message}`);
    if (!note) return res.status(404).json({ success: false, error: 'Note not found' });
    
    // 检查是否是作者（只有作者可以删除协作者）
    if (note.user !== currentUserId) {
      return res.status(403).json({ success: false, error: '只有笔记作者可以删除协作者' });
    }
    
    // 解析现有协作者
    let collaboratorIds: string[] = [];
    try {
      collaboratorIds = JSON.parse(note.collaborators || '[]');
    } catch {
      collaboratorIds = [];
    }
    
    // 删除协作者
    collaboratorIds = collaboratorIds.filter(cid => cid !== userId);
    
    const { data, error } = await client.from('notes')
      .update({ collaborators: JSON.stringify(collaboratorIds) })
      .eq('id', id)
      .select();
    
    if (error) throw new Error(`更新失败: ${error.message}`);
    
    res.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 搜索用户（用于添加协作者）
router.get('/search/users', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || (q as string).length < 1) {
      return res.json({ success: true, data: [] });
    }
    
    const client = getSupabaseClient();
    const { data, error } = await client.from('users')
      .select('user_id, user_name')
      .ilike('user_name', `%${q}%`)
      .limit(20);
    
    if (error) throw new Error(`搜索失败: ${error.message}`);
    
    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
