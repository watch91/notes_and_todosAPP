import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// GET /api/supabase-config - Get Supabase URL and anon key for client
router.get('/', (req, res) => {
  try {
    const client = getSupabaseClient();
    const supabaseUrl = process.env.COZE_SUPABASE_URL;
    const supabaseAnonKey = process.env.COZE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    res.json({ url: supabaseUrl, anonKey: supabaseAnonKey });
  } catch (error) {
    console.error('Failed to get Supabase config:', error);
    res.status(500).json({ error: 'Failed to get Supabase config' });
  }
});

export default router;
