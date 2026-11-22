import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LOCAL_API_BASE_URL = 'http://localhost:9091';

function normalizeBaseUrl(value?: string): string | undefined {
  const normalized = value?.trim().replace(/\/+$/, '');
  return normalized || undefined;
}

function getWebOrigin(): string | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const origin = normalizeBaseUrl(window.location.origin);
  return origin && origin !== 'null' ? origin : undefined;
}

const buildTimeBaseUrl = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL
    || (Constants.expoConfig?.extra?.backendBaseUrl as string | undefined),
);

// Web is served by the same Express process in production and proxied in development.
// Native builds use the deployment URL injected at build time, with localhost for development.
export const API_BASE = getWebOrigin() ?? buildTimeBaseUrl ?? LOCAL_API_BASE_URL;
