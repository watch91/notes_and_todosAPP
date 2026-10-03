import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { logger } from '@/utils/logger';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

function UpdateChecker() {
  useAutoUpdate();
  return null;
}

export default function RootLayout() {
  // 记录应用启动日志
  logger.info('系统', '应用启动');
  
  return (
    <Provider>
      <UpdateChecker />
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="note-edit" />
        <Stack.Screen name="todo-edit" />
        <Stack.Screen name="help" />
        <Stack.Screen name="dev-mode" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="agreement" />
        <Stack.Screen name="starry-wisdom" />
        <Stack.Screen name="voice-record" />
        <Stack.Screen name="account-switch" />
        <Stack.Screen name="ai-assistant" />
      </Stack>
      <Toast />
    </Provider>
  );
}
