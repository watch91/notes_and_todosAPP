import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { APP_VERSION } from '@/utils/version';

export default function ProfilePage() {
  const router = useSafeRouter();
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
              <Text className="text-lg font-bold text-foreground">我的笔记</Text>
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
          <TouchableOpacity className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
              <FontAwesome6 name="star" size={16} color="#F59E0B" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">关于应用</Text>
              <Text className="text-xs text-muted mt-0.5">版本 {APP_VERSION}</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/help')} className="flex-row items-center px-5 py-4">
            <View className="w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center">
              <FontAwesome6 name="circle-info" size={16} color="#06B6D4" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">使用帮助</Text>
              <Text className="text-xs text-muted mt-0.5">常见问题解答</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-end pb-10">
          <Text className="text-xs text-muted">让每一天都井井有条</Text>
        </View>
      </View>
    </Screen>
  );
}
