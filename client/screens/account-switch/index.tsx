import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { decrypt } from '@/utils/crypto';
import { Screen } from '@/components/Screen';

interface SavedAccount {
  userId: string;
  userName: string;
  encryptedPassword: string;
}

const ACCOUNTS_STORAGE_KEY = 'aiostation_accounts';
const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';

export default function AccountSwitchScreen() {
  const router = useSafeRouter();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const raw = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (raw) {
        setAccounts(JSON.parse(raw) as SavedAccount[]);
      } else {
        setAccounts([]);
      }
    } catch (e) {
      console.error('Failed to load accounts:', e);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = useCallback(
    async (account: SavedAccount) => {
      setSubmitting(account.userId);
      try {
        // 服务端文件：server/src/routes/auth.ts
        // 接口：POST /api/v1/auth/login
        // Body 参数：user_id: string, password: string
        const password = decrypt(account.encryptedPassword);
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: account.userId, password }),
        });

        const data = await response.json();

        if (data.success && data.data?.user_id) {
          await AsyncStorage.setItem('user_id', account.userId);
          await AsyncStorage.setItem('user_name', data.data.user_name || account.userName);
          router.replace('/');
        } else {
          Alert.alert('登录失败', data.error || '账号或密码不正确');
        }
      } catch (error: any) {
        Alert.alert('网络错误', '请检查网络连接后重试');
        console.error('Login error:', error);
      } finally {
        setSubmitting(null);
      }
    },
    [router],
  );

  const renderAccountItem = useCallback(
    ({ item }: { item: SavedAccount }) => {
      const isSubmitting = submitting === item.userId;
      return (
        <TouchableOpacity
          onPress={() => handleLogin(item)}
          disabled={isSubmitting}
          className="flex-row items-center px-5 py-4 mx-4 mb-3 rounded-2xl bg-white shadow-sm"
        >
          <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-lg font-bold text-blue-600">
              {item.userName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View className="flex-1 ml-4">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {item.userName || '未命名'}
            </Text>
            <Text className="text-xs text-muted mt-0.5 font-mono" numberOfLines={1}>
              {item.userId}
            </Text>
          </View>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          )}
        </TouchableOpacity>
      );
    },
    [submitting, handleLogin],
  );

  if (loading) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-row items-center px-3 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white shadow-sm items-center justify-center mr-3"
          accessibilityLabel="返回"
        >
          <FontAwesome6 name="arrow-left" size={16} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">切换账号</Text>
          <Text className="text-sm text-muted mt-0.5">点击账号可直接登录，无需输入密码</Text>
        </View>
      </View>

      {accounts.length === 0 ? (
        <View className="flex-1 justify-center items-center px-10">
          <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
            <FontAwesome6 name="users" size={32} color="#9CA3AF" />
          </View>
          <Text className="text-base font-medium text-foreground mb-1">暂无缓存账号</Text>
          <Text className="text-sm text-muted text-center">
            登录后勾选「保存账号密码」即可快速切换
          </Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.userId}
          renderItem={renderAccountItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          className="px-0"
        />
      )}
    </Screen>
  );
}
