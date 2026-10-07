import { View, Text, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Uniwind } from 'uniwind';
import { logger } from '@/utils/logger';

type ThemeMode = 'system' | 'light' | 'dark';
type SortMode = 'updated_at' | 'created_at';
type UiVersion = 'new' | 'old';

export default function SettingsPage() {
  const router = useSafeRouter();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [sortMode, setSortMode] = useState<SortMode>('updated_at');
  const [homeUi, setHomeUi] = useState<UiVersion>('new');
  const [noteEditUi, setNoteEditUi] = useState<UiVersion>('new');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    logger.info('设置', '进入设置页面');
    loadThemeSetting();
    loadSortSetting();
    loadHomeUiSetting();
    loadNoteEditUiSetting();
    loadUserInfo();
  }, []);

  const loadThemeSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_mode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeMode(saved);
      }
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const loadSortSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('home_sort_preference');
      if (saved === 'updated_at' || saved === 'created_at') {
        setSortMode(saved);
      }
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const loadHomeUiSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('home_ui_preference');
      if (saved === 'new' || saved === 'old') {
        setHomeUi(saved);
      }
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const loadNoteEditUiSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('note_edit_ui_preference');
      if (saved === 'new' || saved === 'old') {
        setNoteEditUi(saved);
      }
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const loadUserInfo = async () => {
    try {
      const id = await AsyncStorage.getItem('user_id');
      const name = await AsyncStorage.getItem('user_name');
      setUserId(id);
      setUserName(name);
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Web 端使用 window.confirm，移动端使用 Alert
    if (Platform.OS === 'web') {
      if (window.confirm('确定要退出登录吗？')) {
        AsyncStorage.removeItem('user_id');
        AsyncStorage.removeItem('user_name');
        setUserId(null);
        setUserName(null);
        logger.info('设置', '用户退出登录');
        router.replace('/');
      }
    } else {
      Alert.alert('退出登录', '确定要退出登录吗？', [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('user_id');
              await AsyncStorage.removeItem('user_name');
              setUserId(null);
              setUserName(null);
              logger.info('设置', '用户退出登录');
              router.replace('/');
            } catch (e) {
              logger.error('设置', e instanceof Error ? e : new Error(String(e)));
            }
          },
        },
      ]);
    }
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    const modeNames = { system: '跟随系统', light: '浅色模式', dark: '深色模式' };
    logger.info('设置', `切换主题: ${modeNames[mode]}`);
    setThemeMode(mode);
    Uniwind.setTheme(mode);
    try {
      await AsyncStorage.setItem('theme_mode', mode);
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handleSortChange = async (mode: SortMode) => {
    const modeNames = { updated_at: '按更新时间排序', created_at: '按创建时间排序' };
    logger.info('设置', `切换首页排序: ${modeNames[mode]}`);
    setSortMode(mode);
    try {
      await AsyncStorage.setItem('home_sort_preference', mode);
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handleHomeUiChange = async (mode: UiVersion) => {
    const modeNames = { new: '新版（瀑布流）', old: '旧版（列表）' };
    logger.info('设置', `切换首页界面: ${modeNames[mode]}`);
    setHomeUi(mode);
    try {
      await AsyncStorage.setItem('home_ui_preference', mode);
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handleNoteEditUiChange = async (mode: UiVersion) => {
    const modeNames = { new: '新版（小红书风格）', old: '旧版' };
    logger.info('设置', `切换笔记阅读界面: ${modeNames[mode]}`);
    setNoteEditUi(mode);
    try {
      await AsyncStorage.setItem('note_edit_ui_preference', mode);
    } catch (e) {
      logger.error('设置', e instanceof Error ? e : new Error(String(e)));
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

        {/* Account Info */}
        <View className="mx-5 mt-4">
          <Text className="text-sm text-muted mb-3 ml-1">账号信息</Text>
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {userId ? (
              <>
                <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
                  <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
                    <FontAwesome6 name="circle-user" size={16} color="#8B5CF6" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-medium text-foreground">{userName || '未设置昵称'}</Text>
                    <Text className="text-xs text-muted mt-0.5">ID: {userId}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/account-switch')}
                  className="flex-row items-center px-5 py-4 border-b border-gray-100"
                >
                  <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                    <FontAwesome6 name="users" size={16} color="#3B82F6" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-medium text-foreground">切换账号</Text>
                    <Text className="text-xs text-muted mt-0.5">从缓存账号中选择登录</Text>
                  </View>
                  <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLogout}
                  className="flex-row items-center px-5 py-4"
                >
                  <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                    <FontAwesome6 name="right-from-bracket" size={16} color="#EF4444" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-medium text-red-500">退出登录</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/login')}
                className="flex-row items-center px-5 py-4"
              >
                <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center">
                  <FontAwesome6 name="user-plus" size={16} color="#4F46E5" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-medium text-foreground">登录/注册</Text>
                  <Text className="text-xs text-muted mt-0.5">点击登录或创建账号</Text>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
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
                <FontAwesome6 name="mobile" size={16} color="#3B82F6" />
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

        {/* List Settings */}
        <View className="mx-5 mt-4">
          <Text className="text-sm text-muted mb-3 ml-1">列表设置</Text>
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
              onPress={() => handleSortChange('updated_at')}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
                <FontAwesome6 name="clock-rotate-left" size={16} color="#10B981" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">按更新时间排序</Text>
                <Text className="text-xs text-muted mt-0.5">最近编辑过的笔记排在前面</Text>
              </View>
              {sortMode === 'updated_at' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSortChange('created_at')}
              className="flex-row items-center px-5 py-4"
            >
              <View className="w-10 h-10 rounded-xl bg-violet-50 items-center justify-center">
                <FontAwesome6 name="calendar-plus" size={16} color="#8B5CF6" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">按创建时间排序</Text>
                <Text className="text-xs text-muted mt-0.5">最新创建的笔记排在前面</Text>
              </View>
              {sortMode === 'created_at' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* UI Version Settings - 主页 */}
        <View className="mx-5 mt-4">
          <Text className="text-sm text-muted mb-3 ml-1">主页样式</Text>
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
              onPress={() => handleHomeUiChange('new')}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                <FontAwesome6 name="table-cells-large" size={16} color="#3B82F6" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">新版</Text>
                <Text className="text-xs text-muted mt-0.5">更加现代的界面风格</Text>
              </View>
              {homeUi === 'new' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleHomeUiChange('old')}
              className="flex-row items-center px-5 py-4"
            >
              <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center">
                <FontAwesome6 name="list-ul" size={16} color="#F97316" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">旧版</Text>
                <Text className="text-xs text-muted mt-0.5">经典界面，怀旧情怀</Text>
              </View>
              {homeUi === 'old' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* UI Version Settings - 笔记阅读模式 */}
        <View className="mx-5 mt-4">
          <Text className="text-sm text-muted mb-3 ml-1">笔记阅读样式</Text>
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
              onPress={() => handleNoteEditUiChange('new')}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                <FontAwesome6 name="book-bookmark" size={16} color="#3B82F6" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">新版</Text>
                <Text className="text-xs text-muted mt-0.5">简约的阅读体验</Text>
              </View>
              {noteEditUi === 'new' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleNoteEditUiChange('old')}
              className="flex-row items-center px-5 py-4"
            >
              <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center">
                <FontAwesome6 name="rectangle-list" size={16} color="#F97316" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-foreground">旧版</Text>
                <Text className="text-xs text-muted mt-0.5">经典的阅读页面</Text>
              </View>
              {noteEditUi === 'old' && <FontAwesome6 name="circle-check" size={20} color="#4F46E5" />}
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
