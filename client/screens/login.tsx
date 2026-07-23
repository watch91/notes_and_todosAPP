import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';
import { getSupabaseBrowserClientAsync } from '@/lib/supabase-browser';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';

type LoginMode = 'phone' | 'email';
type EmailView = 'login' | 'register';
type PhoneView = 'input' | 'verify';

export default function LoginScreen() {
  const { config, isLoading: configLoading, error: configError } = useSupabaseConfig();
  const router = useSafeRouter();

  // Login mode
  const [loginMode, setLoginMode] = useState<LoginMode>('phone');

  // Email login/register
  const [emailView, setEmailView] = useState<EmailView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Phone login
  const [phoneView, setPhoneView] = useState<PhoneView>('input');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (configLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  if (configError) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <FontAwesome6 name="triangle-exclamation" size={48} color="#EF4444" />
          <Text style={styles.errorText}>配置加载失败</Text>
          <Text style={styles.errorDetail}>{configError}</Text>
        </View>
      </Screen>
    );
  }

  // Email login/register
  const handleEmailLogin = async () => {
    if (!email || !password) {
      setEmailError('请输入邮箱和密码');
      return;
    }
    setEmailError('');
    setEmailLoading(true);
    try {
      const supabase = await getSupabaseBrowserClientAsync();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setEmailError('邮箱或密码错误');
      } else if (data.session) {
        router.replace('/');
      }
    } catch (err) {
      setEmailError('登录失败，请重试');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!email || !password || !confirmPassword) {
      setEmailError('请填写完整信息');
      return;
    }
    if (password !== confirmPassword) {
      setEmailError('两次密码不一致');
      return;
    }
    if (password.length < 6) {
      setEmailError('密码至少6位');
      return;
    }
    setEmailError('');
    setEmailLoading(true);
    try {
      const supabase = await getSupabaseBrowserClientAsync();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setEmailError(error.message);
      } else if (data.session) {
        // Auto-confirm enabled, login directly
        router.replace('/');
      } else {
        setEmailError('注册成功，请登录');
        setEmailView('login');
      }
    } catch (err) {
      setEmailError('注册失败，请重试');
    } finally {
      setEmailLoading(false);
    }
  };

  // Phone login
  const handleSendOtp = async () => {
    if (!phone || phone.length < 11) {
      setPhoneError('请输入正确的手机号');
      return;
    }
    setPhoneError('');
    setPhoneLoading(true);
    try {
      const supabase = await getSupabaseBrowserClientAsync();
      const { error } = await supabase.auth.signInWithOtp({ phone: '+86' + phone });
      if (error) {
        setPhoneError(error.message);
      } else {
        setPhoneView('verify');
        setCountdown(60);
      }
    } catch (err) {
      setPhoneError('发送验证码失败');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length < 6) return;
    setPhoneError('');
    setPhoneLoading(true);
    try {
      const supabase = await getSupabaseBrowserClientAsync();
      const { data, error } = await supabase.auth.verifyOtp({
        phone: '+86' + phone,
        token: code,
        type: 'sms',
      });
      if (error) {
        setPhoneError('验证码错误或已过期');
        setOtpCode('');
      } else if (data.session) {
        router.replace('/');
      }
    } catch (err) {
      setPhoneError('验证失败，请重试');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    await handleSendOtp();
  };

  // Render email login/register view
  const renderEmailView = () => (
    <View style={styles.formContainer}>
      {emailView === 'login' ? (
        <>
          <Text style={styles.formTitle}>邮箱登录</Text>
          <TextInput
            style={styles.input}
            placeholder="邮箱"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="密码"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <FontAwesome6 name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleEmailLogin}
            disabled={emailLoading}
          >
            {emailLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>登录</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEmailView('register'); setEmailError(''); }}>
            <Text style={styles.switchText}>还没有账号？去注册</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.formTitle}>邮箱注册</Text>
          <TextInput
            style={styles.input}
            placeholder="邮箱"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="密码（至少6位）"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <FontAwesome6 name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="确认密码"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleEmailRegister}
            disabled={emailLoading}
          >
            {emailLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>注册</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEmailView('login'); setEmailError(''); }}>
            <Text style={styles.switchText}>已有账号？去登录</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // Render phone login view
  const renderPhoneView = () => (
    <View style={styles.formContainer}>
      {phoneView === 'input' ? (
        <>
          <Text style={styles.formTitle}>手机号登录</Text>
          <View style={styles.phoneContainer}>
            <Text style={styles.countryCode}>+86</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="手机号"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSendOtp}
            disabled={phoneLoading}
          >
            {phoneLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>发送验证码</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.formTitle}>输入验证码</Text>
          <Text style={styles.phoneDisplay}>已发送至 +86 {phone}</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="6位验证码"
            value={otpCode}
            onChangeText={(text) => {
              const cleaned = text.replace(/\D/g, '').slice(0, 6);
              setOtpCode(cleaned);
              if (cleaned.length === 6) {
                handleVerifyOtp(cleaned);
              }
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOtp}
            disabled={countdown > 0}
          >
            <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
              {countdown > 0 ? `${countdown}秒后重新发送` : '重新发送'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setPhoneView('input'); setPhoneError(''); setOtpCode(''); }}>
            <Text style={styles.switchText}>更换手机号</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* App Icon and Name */}
          <View style={styles.header}>
            <Image
              source={{ uri: 'https://coze-coding-project.tos.coze.site/gen_project_icon/2026-05-09/7637892429022167074_1778337894.png?sign=4903473974-2fdff138ed-0-63041edb0a35eab421344d2feb3a28e1be874cd78f755bd88a98462b551d68e4' }}
              style={styles.appIcon}
            />
            <Text style={styles.appName}>笔记待办App</Text>
          </View>

          {/* Login Mode Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'phone' && styles.activeTab]}
              onPress={() => setLoginMode('phone')}
            >
              <Text style={[styles.tabText, loginMode === 'phone' && styles.activeTabText]}>
                手机号登录
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'email' && styles.activeTab]}
              onPress={() => setLoginMode('email')}
            >
              <Text style={[styles.tabText, loginMode === 'email' && styles.activeTabText]}>
                邮箱登录
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Form */}
          {loginMode === 'email' ? renderEmailView() : renderPhoneView()}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  formContainer: {
    gap: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  countryCode: {
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
    paddingVertical: 14,
  },
  phoneInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  otpInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#f9f9f9',
  },
  phoneDisplay: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  submitButton: {
    height: 48,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  switchText: {
    fontSize: 14,
    color: '#4F46E5',
    textAlign: 'center',
    marginTop: 8,
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#4F46E5',
  },
  resendTextDisabled: {
    color: '#999',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});
