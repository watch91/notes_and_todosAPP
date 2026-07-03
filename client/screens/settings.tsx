import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Uniwind } from 'uniwind';

type ThemeMode = 'system' | 'light' | 'dark';

export default function SettingsPage() {
  const router = useSafeRouter();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemeSetting();
  }, []);

  const loadThemeSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_mode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeMode(saved);
      }
    } catch (e) {
      console.error('Failed to load theme setting:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    setThemeMode(mode);
    Uniwind.setTheme(mode);
    try {
      await AsyncStorage.setItem('theme_mode', mode);
    } catch (e) {
      console.error('Failed to save theme setting:', e);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 bg-background items-center justify-center">
          <Text className="text-muted">加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <FontAwesome6 name="chevron-left" size={18} color="#374151" />
          </TouchableOpacity>
          <Text className="flex-1 text-xl font-bold text-foreground text-center mr-10">设置</Text>
        </View>

        {/* Theme Settings */}
        <View className="mx-5 mt-4">
          <Text className="text-sm text-muted mb-3 ml-1">外观设置</Text>
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <TouchableOpacity
              onPress={() => handleThemeChange('system')}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                <FontAwesome6 name="mobile-screen" size={16} color="#3B82F6" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">跟随系统</Text>
                <Text className="text-xs text-muted mt-0.5">自动适配系统主题</Text>
              </View>
              {themeMode === 'system' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleThemeChange('light')}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
                <FontAwesome6 name="sun" size={16} color="#F59E0B" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">浅色模式</Text>
                <Text className="text-xs text-muted mt-0.5">始终使用浅色主题</Text>
              </View>
              {themeMode === 'light' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleThemeChange('dark')}
              className="flex-row items-center px-5 py-4"
            >
              <View className="w-10 h-10 rounded-xl bg-gray-800 items-center justify-center">
                <FontAwesome6 name="moon" size={16} color="#9CA3AF" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">深色模式</Text>
                <Text className="text-xs text-muted mt-0.5">始终使用深色主题</Text>
              </View>
              {themeMode === 'dark' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Other Settings */}
        <View className="mx-5 mt-6">
          <Text className="text-sm text-muted mb-3 ml-1">其他</Text>
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <TouchableOpacity
              onPress={() => router.push('/agreement')}
              className="flex-row items-center px-5 py-4"
            >
              <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center">
                <FontAwesome6 name="file-contract" size={16} color="#4F46E5" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">用户使用协议</Text>
                <Text className="text-xs text-muted mt-0.5">查看协议条款</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Screen>
  );
}
