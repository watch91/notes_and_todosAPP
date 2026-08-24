import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
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

// 初始化通知渠道（仅 Android）
const initNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'update-channel',
      name: '版本更新',
      importance: AndroidImportance.HIGH,
    });
  }
};

// 显示更新提醒（弹窗 + 通知）
const showUpdateAlert = async (title: string, message: string, downloadUrl?: string) => {
  // 移动端同时发送通知和弹窗
  if (Platform.OS !== 'web') {
    await notifee.displayNotification({
      title,
      body: message,
      android: {
        channelId: 'update-channel',
        pressAction: {
          id: 'default',
        },
      },
      data: {
        downloadUrl: downloadUrl || '',
      },
    });
  }

  // 所有平台都显示弹窗
  Alert.alert(
    title,
    message,
    [
      { text: '稍后', style: 'cancel' },
      { text: '立即更新', onPress: () => {
        if (downloadUrl) {
          Linking.openURL(downloadUrl);
        }
      }}
    ]
  );
};

// 检查正式版更新
const checkStableUpdate = async (data: { new_version?: string; download_url?: string; version_suffix?: string }) => {
  if (data.new_version && compareVersions(APP_VERSION, data.new_version)) {
    const versionDisplay = data.version_suffix 
      ? `v${data.new_version} ${data.version_suffix}`
      : `v${data.new_version}`;
    
    await showUpdateAlert(
      '发现新版本',
      `当前版本 ${APP_VERSION}，最新版本 ${versionDisplay}，是否立即更新？`,
      data.download_url
    );
  }
};

export function useAutoUpdate() {
  useEffect(() => {
    const init = async () => {
      // 初始化通知渠道
      await initNotificationChannel();
      
      // 检查版本更新
      try {
        const res = await fetch(`${API_BASE}/api/v1/version`);
        const data = await res.json();
        
        // 先检查 Beta 版本更新
        if (data.Version_beta_testing && compareVersions(APP_VERSION, data.Version_beta_testing)) {
          // 移动端同时发送通知和弹窗
          if (Platform.OS !== 'web') {
            await notifee.displayNotification({
              title: '有可用的内测版更新',
              body: `有可用的内测版更新：v${data.Version_beta_testing}，是否更新？`,
              android: {
                channelId: 'update-channel',
                pressAction: {
                  id: 'default',
                },
              },
              data: {
                downloadUrl: data.beta_version_download_URL || '',
              },
            });
          }

          // 所有平台都显示弹窗
          Alert.alert(
            '有可用的内测版更新',
            `有可用的内测版更新：v${data.Version_beta_testing}，是否更新？\n\n注：使用内测版本可以优先使用最新功能，但软件稳定性无法保证`,
            [
              { 
                text: '下载正式版', 
                style: 'cancel',
                onPress: () => {
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
          await checkStableUpdate(data);
        }
      } catch (e) {
        // 静默处理
      }
    };
    
    init();
  }, []);
}
