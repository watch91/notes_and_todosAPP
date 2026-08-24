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
    data.forEach((item: { key: string; value: string }) => { config[item.key] = item.value; });
    res.json({ 
      new_version: config.new_version || '1.0.0', 
      download_url: config.download_url || '',
      Version_beta_testing: config.Version_beta_testing || '',
      beta_version_download_URL: config.beta_version_download_URL || '',
      version_suffix: config.version_suffix || ''
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新版本信息
router.post('/', async (req, res) => {
  try {
    const { new_version, download_url, Version_beta_testing, beta_version_download_URL, version_suffix } = req.body;
    const client = getSupabaseClient();
    
    if (new_version !== undefined) {
      await client.from('app_config').upsert({ key: 'new_version', value: new_version });
    }
    if (download_url !== undefined) {
      await client.from('app_config').upsert({ key: 'download_url', value: download_url });
    }
    if (Version_beta_testing !== undefined) {
      await client.from('app_config').upsert({ key: 'Version_beta_testing', value: Version_beta_testing });
    }
    if (beta_version_download_URL !== undefined) {
      await client.from('app_config').upsert({ key: 'beta_version_download_URL', value: beta_version_download_URL });
    }
    if (version_suffix !== undefined) {
      await client.from('app_config').upsert({ key: 'version_suffix', value: version_suffix });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
