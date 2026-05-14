import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export function useAutoUpdate() {
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      if (isChecking) return;
      setIsChecking(true);
      
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update?.isAvailable) {
          Alert.alert(
            '发现新版本',
            '有新版本可用，是否立即更新？',
            [
              { text: '稍后', style: 'cancel' },
              { 
                text: '立即更新', 
                onPress: async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch (e) {
                    console.error('更新失败:', e);
                  }
                }
              }
            ]
          );
        }
      } catch (e) {
        // 静默处理更新检查错误
      } finally {
        setIsChecking(false);
      }
    };

    // 应用加载时自动检查更新
    checkForUpdates();
  }, []);
}
