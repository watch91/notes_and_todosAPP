import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { APP_VERSION } from '@/utils/version';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

const compareVersions = (a: string, b: string): boolean => {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum < bNum) return true;
    if (aNum > bNum) return false;
  }
  return false;
};

export function useAutoUpdate() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/version`);
        const data = await res.json();
        if (data.new_version && compareVersions(APP_VERSION, data.new_version)) {
          Alert.alert(
            '发现新版本',
            `当前版本 ${APP_VERSION}，最新版本 ${data.new_version}，是否立即更新？`,
            [
              { text: '稍后', style: 'cancel' },
              { text: '立即更新', onPress: () => {
                if (data.download_url) {
                  Linking.openURL(data.download_url);
                }
              }}
            ]
          );
        }
      } catch (e) {
        // 静默处理
      }
    };
    checkVersion();
  }, []);
}
