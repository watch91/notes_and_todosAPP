import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// 配置 API Key（实际使用时应该从环境变量读取）
const API_KEY = process.env.PUBLIC_API_KEY || 'your-api-key-here';

// API Key 验证中间件
const validateApiKey = (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid API Key. Please provide a valid API Key in the X-API-Key header or api_key query parameter.' 
    });
  }
  
  next();
};

// 获取所有笔记（公开 API）
router.get('/notes', validateApiKey, async (req: any, res: any) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('notes')
      .select('id, title, content, updated_at')
      .order('updated_at', { ascending: false });
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    res.json({ 
      success: true, 
      data,
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching public notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个笔记（公开 API）
router.get('/notes/:id', validateApiKey, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('notes')
      .select('id, title, content, updated_at')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    if (!data) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    
    res.json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching public note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 搜索笔记（公开 API）
router.get('/notes/search', validateApiKey, async (req: any, res: any) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }
    
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('notes')
      .select('id, title, content, updated_at')
      .ilike('title', `%${q}%`)
      .order('updated_at', { ascending: false });
    
    if (error) throw new Error(`搜索失败: ${error.message}`);
    
    res.json({ 
      success: true, 
      data,
      count: data?.length || 0,
      query: q,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error searching public notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 文档
router.get('/', (req: any, res: any) => {
  res.json({
    name: '笔记待办APP 公开API',
    version: '1.0.0',
    description: '提供笔记内容的读取接口，供外部应用调用',
    authentication: {
      type: 'API Key',
      header: 'X-API-Key',
      query_param: 'api_key',
      note: '请联系管理员获取 API Key'
    },
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/notes',
        description: '获取所有笔记',
        parameters: [],
        example: 'GET /api/public/notes'
      },
      {
        method: 'GET',
        path: '/api/public/notes/:id',
        description: '获取单个笔记',
        parameters: [
          { name: 'id', type: 'string', required: true, description: '笔记ID' }
        ],
        example: 'GET /api/public/notes/123'
      },
      {
        method: 'GET',
        path: '/api/public/notes/search',
        description: '搜索笔记',
        parameters: [
          { name: 'q', type: 'string', required: true, description: '搜索关键词' }
        ],
        example: 'GET /api/public/notes/search?q=教程'
      }
    ]
  });
});

export default router;
