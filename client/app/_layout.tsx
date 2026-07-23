import { Stack } from 'expo-router';
import { useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { logger } from '@/utils/logger';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

function UpdateChecker() {
  useAutoUpdate();
  return null;
}

function AuthGuard() {
  const router = useSafeRouter();
  const rootState = useRootNavigationState();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Wait for navigation and auth to be ready
    if (!rootState?.key || isLoading) return;

    const inLoginRoute = segments.includes('login');

    // Not authenticated and not in login route -> redirect to login
    if (!isAuthenticated && !inLoginRoute) {
      router.replace('/login');
    }
    // Authenticated and in login route -> redirect to home
    if (isAuthenticated && inLoginRoute) {
      router.replace('/');
    }
  }, [rootState?.key, isLoading, isAuthenticated, segments]);

  return null;
}

export default function RootLayout() {
  // 记录应用启动日志
  logger.info('系统', '应用启动');
  
  return (
    <Provider>
      <SupabaseConfigProvider>
        <AuthProvider>
          <UpdateChecker />
          <AuthGuard />
          <Stack
            screenOptions={{
              animation: 'slide_from_right',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="note-edit" />
            <Stack.Screen name="todo-edit" />
            <Stack.Screen name="help" />
            <Stack.Screen name="dev-mode" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="agreement" />
            <Stack.Screen name="starry-wisdom" />
          </Stack>
          <Toast />
        </AuthProvider>
      </SupabaseConfigProvider>
    </Provider>
  );
}
