import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// 获取版本信息
router.get('/', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('app_config').select('*');
    if (error) throw new Error(`获取失败: ${error.message}`);
    
    const config: Record<string, string> = {};
    data.forEach(item => { config[item.key] = item.value; });
    res.json({ new_version: config['new_version'] || '1.0.0', download_url: config['download_url'] || '' });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新版本信息
router.post('/', async (req, res) => {
  try {
    const { new_version, download_url } = req.body;
    const client = getSupabaseClient();
    
    if (new_version !== undefined) {
      await client.from('app_config').upsert({ key: 'new_version', value: new_version });
    }
    if (download_url !== undefined) {
      await client.from('app_config').upsert({ key: 'download_url', value: download_url });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
