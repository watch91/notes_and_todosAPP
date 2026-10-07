import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// 辅助函数：将时间字段规范化为带 UTC 时区的 ISO 格式
function normalizeTimestamps(item: Record<string, any>): Record<string, any> {
  if (item && typeof item === 'object') {
    const result: Record<string, any> = { ...item };
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

function normalizeNotesTimestamps(data: any[] | null | undefined): any[] | null | undefined {
  if (!data) return data;
  return data.map(item => normalizeTimestamps(item));
}

// 随机推荐笔记（按更新时间衰减权重的新鲜度推荐）
// 年龄越大权重越小，但仍可能命中（保证完全的随机性）
router.get('/recommend', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt((req.query.limit as string) || '30', 10) || 30, 100));
    const labelParam = req.query.label as string | undefined;
    const client = getSupabaseClient();

    // 1) 先查全部（或按 label_1 过滤）的候选笔记
    let query = client.from('notes').select('*');
    if (labelParam) {
      const labelId = parseInt(labelParam, 10);
      if (!Number.isNaN(labelId)) {
        query = query.eq('label_1', labelId);
      }
    }
    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data || data.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 2) 计算每条笔记的权重：weight = 1 / (1 + age_days)
    //    其中 age_days 基于 updated_at 计算（天数）
    //    越新的笔记 age 越小 → 权重越大，但所有笔记仍非零，旧的也有机会命中
    const now = Date.now();
    const itemsWithWeight = data.map((n: Record<string, any>) => {
      const updated = n.updated_at ? new Date(n.updated_at).getTime() : now;
      const ageDays = Math.max(0, (now - updated) / 86400000);
      const weight = 1 / (1 + ageDays);
      return { note: n, weight };
    });

    // 3) 计算累计权重
    let totalWeight = 0;
    const cumulative: { note: any; cumWeight: number }[] = [];
    for (const item of itemsWithWeight) {
      totalWeight += item.weight;
      cumulative.push({ note: item.note, cumWeight: totalWeight });
    }

    // 4) 加权随机抽取（不放回，循环直到取够 limit 条或达到最大尝试次数）
    const picked: any[] = [];
    const pickedIds = new Set<number>();
    const maxAttempts = limit * 10;
    let attempts = 0;
    while (picked.length < limit && attempts < maxAttempts) {
      attempts++;
      // 随机一个累计权重点
      const r = Math.random() * totalWeight;
      // 二分查找命中点
      let lo = 0;
      let hi = cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cumulative[mid].cumWeight < r) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      const hit = cumulative[lo];
      if (!pickedIds.has(hit.note.id)) {
        pickedIds.add(hit.note.id);
        picked.push(hit.note);
      }
      // 候选不足时退出
      if (pickedIds.size >= cumulative.length) break;
    }

    // 5) 获取作者信息
    const userIds = [...new Set(picked.filter((n: any) => n.user).map((n: any) => n.user))];
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

    // 6) 解析 images JSON 字符串、附上 author_name 和协作数量
    const notesWithMeta = picked.map((note: any) => {
      let images: string[] = [];
      try {
        images = JSON.parse(note.images || '[]');
      } catch {
        images = [];
      }
      let collaboratorCount = 0;
      try {
        collaboratorCount = JSON.parse(note.collaborators || '[]').length;
      } catch {
        collaboratorCount = 0;
      }
      return {
        ...note,
        images,
        author_name: note.user ? (userMap[note.user] || '匿名用户') : '匿名用户',
        collaborator_count: collaboratorCount,
      };
    });

    res.json({ success: true, data: normalizeNotesTimestamps(notesWithMeta) });
  } catch (error: any) {
    console.error('Error recommending notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    const sort = (req.query.sort as string) || 'updated_at';
    // 限制允许的排序字段，防止任意字段排序
    const sortField = sort === 'created_at' ? 'created_at' : 'updated_at';
    const client = getSupabaseClient();
    const { data, error } = await client.from('notes').select('*').order(sortField, { ascending: false });
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
