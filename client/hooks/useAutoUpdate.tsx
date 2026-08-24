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

// 检查正式版更新
const checkStableUpdate = (data: { new_version?: string; download_url?: string; version_suffix?: string }) => {
  if (data.new_version && compareVersions(APP_VERSION, data.new_version)) {
    const versionDisplay = data.version_suffix 
      ? `v${data.new_version} ${data.version_suffix}`
      : `v${data.new_version}`;
    Alert.alert(
      '发现新版本',
      `当前版本 ${APP_VERSION}，最新版本 ${versionDisplay}，是否立即更新？`,
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
};

export function useAutoUpdate() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/version`);
        const data = await res.json();
        
        // 先检查 Beta 版本更新
        if (data.Version_beta_testing && compareVersions(APP_VERSION, data.Version_beta_testing)) {
          Alert.alert(
            '有可用的内测版更新',
            `有可用的内测版更新：v${data.Version_beta_testing}，是否更新？\n\n注：使用内测版本可以优先使用最新功能，但软件稳定性无法保证`,
            [
              { 
                text: '下载正式版', 
                style: 'cancel',
                onPress: () => {
                  // 用户选择下载正式版，执行原有的正式版更新流程
                  checkStableUpdate(data);
                }
              },
              { 
                text: '现在更新', 
                onPress: () => {
                  if (data.beta_version_download_URL) {
                    Linking.openURL(data.beta_version_download_URL);
                  }
                }
              }
            ]
          );
        } else {
          // 没有 Beta 版本更新，检查正式版更新
          checkStableUpdate(data);
        }
      } catch (e) {
        // 静默处理
      }
    };
    checkVersion();
  }, []);
}
