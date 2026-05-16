import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { APP_VERSION } from '@/utils/version';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export function useAutoUpdate() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/version`);
        const data = await res.json();
        if (data.new_version && data.new_version !== APP_VERSION) {
          Alert.alert(
            '发现新版本',
            `检测到新版本 ${data.new_version}，是否立即更新？`,
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
