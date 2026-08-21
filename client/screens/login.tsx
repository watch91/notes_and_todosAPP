import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function LoginPage() {
  const router = useSafeRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredInfo, setRegisteredInfo] = useState<{ userId: string; userName: string; password: string } | null>(null);

  const handleLogin = async () => {
    if (!userName.trim() || !password) {
      Alert.alert('提示', '请输入账号和密码');
      return;
    }

    setIsLoading(true);
    try {
      /**
       * 服务端文件：server/src/routes/auth.ts
       * 接口：POST /api/v1/auth/login
       * Body 参数：user_id: string, password: string
       */
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userName.trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 保存用户信息
        await AsyncStorage.setItem('user_id', data.data.user_id);
        await AsyncStorage.setItem('user_name', data.data.user_name);
        logger.info('登录', `用户 ${data.data.user_name} 登录成功`);
        Alert.alert('登录成功', `欢迎回来，${data.data.user_name}！`);
        router.replace('/settings');
      } else {
        Alert.alert('登录失败', data.error || '账号或密码错误');
      }
    } catch (error) {
      logger.error('登录', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('错误', '网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!userName.trim() || !password) {
      Alert.alert('提示', '请输入昵称和密码');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      Alert.alert('提示', '密码长度至少为6位');
      return;
    }

    setIsLoading(true);
    try {
      /**
       * 服务端文件：server/src/routes/auth.ts
       * 接口：POST /api/v1/auth/register
       * Body 参数：user_name: string, password: string
       */
      const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: userName.trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 显示注册成功信息
        setRegisteredInfo({
          userId: data.data.user_id,
          userName: data.data.user_name,
          password: password,
        });
        logger.info('注册', `用户 ${data.data.user_name} 注册成功，ID: ${data.data.user_id}`);
      } else {
        Alert.alert('注册失败', data.error || '注册失败，请稍后重试');
      }
    } catch (error) {
      logger.error('注册', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('错误', '网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRegistered = async () => {
    if (registeredInfo) {
      // 保存用户信息
      await AsyncStorage.setItem('user_id', registeredInfo.userId);
      await AsyncStorage.setItem('user_name', registeredInfo.userName);
      logger.info('注册', `用户 ${registeredInfo.userName} 已登录`);
      Alert.alert('注册成功', `欢迎，${registeredInfo.userName}！`);
      router.replace('/settings');
    }
  };

  // 注册成功后的信息展示页面
  if (registeredInfo) {
    return (
      <Screen>
        <View className="flex-1 bg-background">
          {/* Header */}
          <View className="flex-row items-center px-5 pt-4 pb-4">
            <TouchableOpacity onPress={() => setRegisteredInfo(null)} className="w-10 h-10 items-center justify-center">
              <FontAwesome6 name="chevron-left" size={18} color="#374151" />
            </TouchableOpacity>
            <Text className="flex-1 text-xl font-bold text-foreground text-center mr-10">注册成功</Text>
          </View>

          <View className="flex-1 px-5 pt-8">
            {/* 成功图标 */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center">
                <FontAwesome6 name="circle-check" size={40} color="#10B981" />
              </View>
              <Text className="text-2xl font-bold text-foreground mt-4">账号创建成功！</Text>
              <Text className="text-sm text-muted mt-2">请牢记以下账号信息</Text>
            </View>

            {/* 账号信息 */}
            <View className="bg-white rounded-2xl p-5 shadow-sm"
              style={{
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="mb-4">
                <Text className="text-xs text-muted mb-1">账号ID</Text>
                <Text className="text-lg font-bold text-foreground">{registeredInfo.userId}</Text>
              </View>
              <View className="mb-4">
                <Text className="text-xs text-muted mb-1">昵称</Text>
                <Text className="text-lg font-bold text-foreground">{registeredInfo.userName}</Text>
              </View>
              <View>
                <Text className="text-xs text-muted mb-1">密码</Text>
                <Text className="text-lg font-bold text-foreground">{registeredInfo.password}</Text>
              </View>
            </View>

            {/* 提示信息 */}
            <View className="mt-6 p-4 bg-amber-50 rounded-xl">
              <View className="flex-row items-center">
                <FontAwesome6 name="triangle-exclamation" size={16} color="#F59E0B" />
                <Text className="text-sm text-amber-700 ml-2 font-medium">重要提示</Text>
              </View>
              <Text className="text-xs text-amber-600 mt-2">
                请妥善保存您的账号信息，特别是账号ID和密码。登录后可以在「我的」页面查看账号信息。
              </Text>
            </View>
          </View>

          {/* 确认按钮 */}
          <View className="px-5 pb-8">
            <TouchableOpacity
              onPress={handleConfirmRegistered}
              className="bg-indigo-500 rounded-xl py-4 items-center"
              style={{
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-white font-semibold text-base">我已记住，进入应用</Text>
            </TouchableOpacity>
          </View>
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
          <Text className="flex-1 text-xl font-bold text-foreground text-center mr-10">
            {mode === 'login' ? '登录' : '注册'}
          </Text>
        </View>

        <View className="flex-1 px-5 pt-8">
          {/* Logo */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-2xl bg-indigo-100 items-center justify-center">
              <FontAwesome6 name="circle-user" size={40} color="#4F46E5" />
            </View>
            <Text className="text-2xl font-bold text-foreground mt-4">
              {mode === 'login' ? '欢迎回来' : '创建账号'}
            </Text>
            <Text className="text-sm text-muted mt-2">
              {mode === 'login' ? '登录您的账号' : '注册新账号'}
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            {/* 账号ID/昵称 */}
            <View>
              <Text className="text-sm text-muted mb-2 ml-1">{mode === 'login' ? '账号ID' : '账号昵称'}</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                <FontAwesome6 name="user" size={16} color="#9CA3AF" />
                <TextInput
                  className="flex-1 ml-3 text-base text-foreground"
                  placeholder={mode === 'login' ? '请输入账号ID' : '请输入账号昵称'}
                  placeholderTextColor="#9CA3AF"
                  value={userName}
                  onChangeText={setUserName}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* 密码 */}
            <View>
              <Text className="text-sm text-muted mb-2 ml-1">密码</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                <FontAwesome6 name="lock" size={16} color="#9CA3AF" />
                <TextInput
                  className="flex-1 ml-3 text-base text-foreground"
                  placeholder="请输入密码"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* 确认密码（仅注册模式） */}
            {mode === 'register' && (
              <View>
                <Text className="text-sm text-muted mb-2 ml-1">确认密码</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                  <FontAwesome6 name="lock" size={16} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-foreground"
                    placeholder="请再次输入密码"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}
          </View>

          {/* 提交按钮 */}
          <TouchableOpacity
            onPress={mode === 'login' ? handleLogin : handleRegister}
            disabled={isLoading}
            className="bg-indigo-500 rounded-xl py-4 items-center mt-8"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {mode === 'login' ? '登录' : '注册'}
              </Text>
            )}
          </TouchableOpacity>

          {/* 切换模式 */}
          <View className="flex-row justify-center items-center mt-6">
            <Text className="text-sm text-muted">
              {mode === 'login' ? '还没有账号？' : '已有账号？'}
            </Text>
            <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
              <Text className="text-sm text-indigo-500 font-medium ml-1">
                {mode === 'login' ? '立即注册' : '立即登录'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Screen>
  );
}
