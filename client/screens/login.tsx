import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export default function LoginPage() {
  const router = useSafeRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const getDeviceId = async () => {
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await AsyncStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('错误', '请填写邮箱和密码');
      return;
    }
    if (!isLogin && !username.trim()) {
      Alert.alert('错误', '请填写用户名');
      return;
    }
    if (!isLogin && username.length < 2) {
      Alert.alert('错误', '用户名至少2个字符');
      return;
    }

    setLoading(true);
    try {
      const userId = email;
      
      if (isLogin) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,username`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        const profiles = await response.json();
        if (profiles && profiles.length > 0) {
          await AsyncStorage.setItem('user_id', userId);
          await AsyncStorage.setItem('username', profiles[0].username);
          Alert.alert('成功', '登录成功', [{ text: '确定', onPress: () => router.replace('/') }]);
        } else {
          Alert.alert('错误', '账号不存在，请先注册');
        }
      } else {
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        const exists = await checkResponse.json();
        if (exists && exists.length > 0) {
          Alert.alert('错误', '该邮箱已注册');
          setLoading(false);
          return;
        }

        await getDeviceId();
        const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: userId,
            username: username.trim()
          })
        });
        const newProfile = await createResponse.json();
        if (newProfile && newProfile.user_id) {
          await AsyncStorage.setItem('user_id', userId);
          await AsyncStorage.setItem('username', username.trim());
          Alert.alert('成功', '注册成功', [{ text: '确定', onPress: () => router.replace('/') }]);
        } else {
          Alert.alert('错误', '注册失败，请重试');
        }
      }
    } catch (error) {
      Alert.alert('错误', '操作失败，请检查网络');
    }
    setLoading(false);
  };

  return (
    <Screen>
      <View className="flex-1 bg-gray-100 justify-center p-6">
        <View className="bg-white rounded-2xl p-6 shadow-lg">
          <Text className="text-2xl font-bold text-center text-indigo-600 mb-6">
            {isLogin ? '登录' : '注册'}
          </Text>

          <Text className="text-gray-600 mb-1">邮箱</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
            placeholder="输入邮箱"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text className="text-gray-600 mb-1">密码</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
            placeholder="输入密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <>
              <Text className="text-gray-600 mb-1">用户名</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
                placeholder="设置用户名（至少2个字符）"
                value={username}
                onChangeText={setUsername}
              />
            </>
          )}

          <TouchableOpacity
            className="bg-indigo-600 rounded-xl py-3 items-center mt-2"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                {isLogin ? '登录' : '注册'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4 items-center"
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text className="text-indigo-600">
              {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
