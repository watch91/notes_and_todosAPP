import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useAuth, User } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ProfilePage() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useSafeRouter();

  useFocusEffect(
    useCallback(() => {
      if (!isLoading && !token) {
        router.replace('/auth');
      }
    }, [token, isLoading, router])
  );

  const handleLogout = () => {
    Alert.alert(
      '提示',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            await logout();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  if (!token) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center bg-background">
          <Text className="text-muted">正在跳转...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 bg-background">
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} className="px-5 pt-4 pb-6">
          <Text className="text-2xl font-bold text-foreground">个人中心</Text>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="mx-5 bg-white rounded-2xl p-5 shadow-sm"
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
            <View className="ml-4 flex-1">
              <Text className="text-lg font-bold text-foreground">
                {user?.email || '用户'}
              </Text>
              <Text className="text-sm text-muted">记录生活每一刻</Text>
            </View>
          </View>
        </Animated.View>

        {/* Menu Items */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="mx-5 mt-6 bg-white rounded-2xl overflow-hidden shadow-sm"
          style={{
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
              <FontAwesome6 name="star" size={16} color="#F59E0B" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">关于应用</Text>
              <Text className="text-xs text-muted mt-0.5">版本 1.0.0</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </View>

          <TouchableOpacity className="flex-row items-center px-5 py-4">
            <View className="w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center">
              <FontAwesome6 name="circle-info" size={16} color="#06B6D4" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">使用帮助</Text>
              <Text className="text-xs text-muted mt-0.5">常见问题解答</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="mx-5 mt-6">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-center shadow-sm"
            style={{
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <FontAwesome6 name="right-from-bracket" size={18} color="#EF4444" />
            <Text className="ml-3 font-medium" style={{ color: '#EF4444' }}>退出登录</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <View className="flex-1 items-center justify-end pb-10">
          <Text className="text-xs text-muted">让每一天都井井有条</Text>
        </View>
      </View>
    </Screen>
  );
}
