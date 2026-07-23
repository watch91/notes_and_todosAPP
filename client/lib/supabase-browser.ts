import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getGlobalSupabaseConfig } from './supabase-config-inject';

let browserClient: SupabaseClient | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient === null) {
    const config = getGlobalSupabaseConfig();

    if (!config || !config.url || !config.anonKey) {
      throw new Error(
        'Supabase config not found. Make sure SupabaseConfigProvider is included in your layout and use useSupabaseConfig() to wait for config to be ready.'
      );
    }

    browserClient = createClient(config.url, config.anonKey, {
      db: {
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}

async function getSupabaseBrowserClientWithRetry(maxRetries = 5, retryInterval = 1000): Promise<SupabaseClient> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return getSupabaseBrowserClient();
    } catch {
      if (i < maxRetries - 1) {
        await sleep(retryInterval);
      }
    }
  }
  return getSupabaseBrowserClient();
}

async function getSupabaseBrowserClientAsync(): Promise<SupabaseClient> {
  if (browserClient !== null) {
    return browserClient;
  }

  // Wait for config to be ready
  let retries = 0;
  while (!getGlobalSupabaseConfig() && retries < 10) {
    await sleep(500);
    retries++;
  }

  return getSupabaseBrowserClient();
}

export { getSupabaseBrowserClient, getSupabaseBrowserClientWithRetry, getSupabaseBrowserClientAsync };
