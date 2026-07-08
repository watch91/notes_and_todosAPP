import { View, Text } from 'react-native';
import { Screen } from '@/components/Screen';

export default function CreativeHallScreen() {
  return (
    <Screen className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          创意大厅
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mt-2">
          敬请期待...
        </Text>
      </View>
    </Screen>
  );
}
