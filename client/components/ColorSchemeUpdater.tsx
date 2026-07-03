import { Fragment, useEffect, type ReactNode } from 'react';
import { ColorSchemeName, Platform } from 'react-native';
import { Uniwind } from 'uniwind'
import AsyncStorage from '@react-native-async-storage/async-storage';

// system: 跟随系统变化
// light: 固定为 light 主题
// dark: 固定为 dark 主题
const DEFAULT_THEME: 'system' | 'light' | 'dark' = 'system'

const WebOnlyColorSchemeUpdater = function ({ children }: { children?: ReactNode }) {
  useEffect(() => {
    // 从 AsyncStorage 读取用户设置的主题
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('theme_mode');
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          Uniwind.setTheme(saved);
        } else {
          Uniwind.setTheme(DEFAULT_THEME);
        }
      } catch (e) {
        Uniwind.setTheme(DEFAULT_THEME);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    function handleMessage(e: MessageEvent<{ event: string; colorScheme: ColorSchemeName; } | undefined>) {
      if (e.data?.event === 'coze.workbench.colorScheme') {
        const cs = e.data.colorScheme;
        if (typeof cs === 'string') {
          Uniwind.setTheme(cs);
        }
      }
    }

    if (Platform.OS === 'web') {
      window.addEventListener('message', handleMessage, false);
    }

    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('message', handleMessage, false);
      }
    }
  }, []);

  return <Fragment>
    {children}
  </Fragment>
};

export {
  WebOnlyColorSchemeUpdater,
}
