import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useSafeRouter();

  // 动画值
  const formScale = useSharedValue(0.9);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);

  React.useEffect(() => {
    // 入场动画
    formOpacity.value = withTiming(1, { duration: 400 });
    formScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    formTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [
      { scale: formScale.value },
      { translateY: formTranslateY.value },
    ],
  }));

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('错误', '请填写邮箱和密码');
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      Alert.alert('错误', '两次密码输入不一致');
      return;
    }
    if (password.length < 6) {
      Alert.alert('错误', '密码至少需要6位');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        router.replace('/(tabs)');
      } else {
        await register(email, password);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('错误', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    // 退出动画
    formScale.value = withSpring(0.95, { damping: 15, stiffness: 100 });
    formOpacity.value = withTiming(0, { duration: 150 });
    
    setTimeout(() => {
      setIsLogin(!isLogin);
      setConfirmPassword('');
      // 重新入场
      formScale.value = withSpring(1, { damping: 15, stiffness: 100 });
      formOpacity.value = withTiming(1, { duration: 300 });
    }, 150);
  };

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>笔记与待办</Text>
          <Text style={styles.subtitle}>{isLogin ? '登录您的账号' : '创建新账号'}</Text>
        </View>

        <Animated.View style={[styles.form, animatedFormStyle]}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>邮箱</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入邮箱"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>密码</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入密码"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {!isLogin && (
            <Animated.View entering={FadeInDown.springify()} exiting={FadeInDown.duration(150)}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>确认密码</Text>
                <TextInput
                  style={styles.input}
                  placeholder="请再次输入密码"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? '登录' : '注册'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={toggleMode}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              {isLogin ? '还没有账号？点击注册' : '已有账号？点击登录'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#4F46E5',
    fontSize: 14,
  },
});
