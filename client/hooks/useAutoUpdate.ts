import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useAutoUpdate() {
  useEffect(() => {
    // 开发环境下 Metro 会自动热更新
    // 生产环境需要配置 EAS Update 服务
    if (Platform.OS === 'web') {
      console.log('Web 环境: 刷新页面即可获取最新代码');
    }
  }, []);
}
