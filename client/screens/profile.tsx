import { View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '@/utils/version';

export default function ProfilePage() {
  const router = useSafeRouter();
  const [devClickCount, setDevClickCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    const uid = await AsyncStorage.getItem('user_id');
    const name = await AsyncStorage.getItem('username');
    setUserId(uid);
    setUsername(name);
  };

  const handleLogout = async () => {
    Alert.alert('提示', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          await AsyncStorage.removeItem('user_id');
          await AsyncStorage.removeItem('username');
          setUserId(null);
          setUsername(null);
          Alert.alert('成功', '已退出登录');
        }
      }
    ]);
  };

  const handleDevModeClick = () => {
    const newCount = devClickCount + 1;
    setDevClickCount(newCount);
    if (newCount >= 7) {
      setShowPasswordModal(true);
      setDevClickCount(0);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === '7891') {
      setShowPasswordModal(false);
      setPassword('');
      router.push('/dev-mode');
    } else {
      Alert.alert('错误', '密码不正确');
      setPassword('');
    }
  };

  return (
    <Screen>
      <View className="flex-1 bg-background">
        <View className="px-5 pt-4 pb-6">
          <Text className="text-2xl font-bold text-foreground">个人中心</Text>
        </View>

        {/* 账号信息 */}
        <View className="mx-5 bg-white rounded-2xl p-5 shadow-sm mb-4"
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
              <View className="flex-row items-center">
                <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center">
                  <FontAwesome6 name="user" size={24} color="#4F46E5" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-lg font-bold text-foreground">{username}</Text>
                  <Text className="text-sm text-muted">账号：{userId}</Text>
                </View>
              </View>
              <TouchableOpacity
                className="mt-4 bg-red-50 rounded-xl py-3 items-center"
                onPress={handleLogout}
              >
                <Text className="text-red-600 font-bold">退出登录</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View className="flex-row items-center mb-4">
                <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center">
                  <FontAwesome6 name="user" size={24} color="#9CA3AF" />
                </View>
                <View className="ml-4">
                  <Text className="text-base text-gray-400">未登录</Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-indigo-600 rounded-xl py-3 items-center"
                onPress={() => router.push('/login')}
              >
                <Text className="text-white font-bold">登录 / 注册</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 其他功能 */}
        <View className="mx-5 bg-white rounded-2xl p-5 shadow-sm"
          style={{
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() => router.push('/help')}
          >
            <FontAwesome6 name="circle-question" size={20} color="#4F46E5" />
            <Text className="ml-4 text-base text-foreground flex-1">使用帮助</Text>
            <FontAwesome6 name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View className="border-t border-gray-100" />

          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() => router.push('/feedback')}
          >
            <FontAwesome6 name="comment-dots" size={20} color="#4F46E5" />
            <Text className="ml-4 text-base text-foreground flex-1">问题反馈</Text>
            <FontAwesome6 name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View className="border-t border-gray-100" />

          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={handleDevModeClick}
          >
            <FontAwesome6 name="code" size={20} color="#4F46E5" />
            <Text className="ml-4 text-base text-foreground flex-1">开发者模式</Text>
            <FontAwesome6 name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View className="border-t border-gray-100" />

          <View className="flex-row items-center py-3">
            <FontAwesome6 name="info-circle" size={20} color="#4F46E5" />
            <Text className="ml-4 text-base text-foreground flex-1">关于应用</Text>
            <Text className="text-sm text-muted">v{APP_VERSION}</Text>
          </View>
        </View>

        {/* 密码弹窗 */}
        <Modal visible={showPasswordModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white rounded-2xl p-6 w-80">
              <Text className="text-lg font-bold text-center mb-4">输入开发者密码</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 mb-4"
                placeholder="密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onSubmitEditing={handlePasswordSubmit}
              />
              <View className="flex-row">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-3 items-center mr-2"
                  onPress={() => { setShowPasswordModal(false); setPassword(''); }}
                >
                  <Text className="text-gray-600">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-indigo-600 rounded-xl py-3 items-center ml-2"
                  onPress={handlePasswordSubmit}
                >
                  <Text className="text-white font-bold">确定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
