import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

function UpdateChecker() {
  useAutoUpdate();
  return null;
}

export default function RootLayout() {
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
      </Stack>
      <Toast />
    </Provider>
  );
}
