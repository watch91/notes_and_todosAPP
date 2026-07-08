import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Linking } from 'react-native';
import { useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { APP_VERSION } from '@/utils/version';

export default function ProfilePage() {
  const router = useSafeRouter();
  const [devClickCount, setDevClickCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');

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

        <View className="mx-5 bg-white rounded-2xl p-5 shadow-sm"
          style={{
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center">
              <FontAwesome6 name="user" size={28} color="#4F46E5" />
            </View>
            <View className="ml-4">
              <Text className="text-lg font-bold text-foreground">笔记</Text>
              <Text className="text-sm text-muted">记录生活每一刻</Text>
            </View>
          </View>
        </View>

        <View className="mx-5 mt-6 bg-white rounded-2xl overflow-hidden shadow-sm"
          style={{
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity onPress={() => router.push('/settings')} className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
              <FontAwesome6 name="gear" size={16} color="#8B5CF6" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">设置</Text>
              <Text className="text-xs text-muted mt-0.5">主题、协议等</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDevModeClick} className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center">
              <FontAwesome6 name="code" size={16} color="#6B7280" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">开发者模式</Text>

            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/help')} className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <View className="w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center">
              <FontAwesome6 name="circle-info" size={16} color="#06B6D4" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">使用帮助</Text>
              <Text className="text-xs text-muted mt-0.5">常见问题解答</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/feedback')} className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
              <FontAwesome6 name="paper-plane" size={16} color="#EF4444" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">问题反馈</Text>
              <Text className="text-xs text-muted mt-0.5">提交遇到的问题</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Linking.openURL('https://vlink.cc/xiaokeke205')} className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center">
              <FontAwesome6 name="mug-hot" size={16} color="#EA580C" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">打赏</Text>
              <Text className="text-xs text-muted mt-0.5">支持软件开发</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center px-5 py-4">
            <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
              <FontAwesome6 name="star" size={16} color="#F59E0B" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">关于应用</Text>
              <Text className="text-xs text-muted mt-0.5">版本 {APP_VERSION}</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-end pb-10">
          <Text className="text-xs text-muted">让每一天都井井有条</Text>
        </View>

        <Modal visible={showPasswordModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 w-72">
              <Text className="text-lg font-bold text-center mb-4">输入密码</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-center text-lg"
                placeholder="请输入密码"
                value={password}
                onChangeText={setPassword}
                keyboardType="number-pad"
                secureTextEntry
              />
              <View className="flex-row mt-4 gap-3">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-3"
                  onPress={() => { setShowPasswordModal(false); setPassword(''); }}
                >
                  <Text className="text-center text-gray-600 font-medium">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-indigo-500 rounded-xl py-3"
                  onPress={handlePasswordSubmit}
                >
                  <Text className="text-center text-white font-medium">确认</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
