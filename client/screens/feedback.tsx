import { Screen } from '@/components/Screen';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { router } from 'expo-router';
import { logger } from '@/utils/logger';
import { apiBase } from '@/utils';

const EXPO_PUBLIC_BACKEND_BASE_URL = apiBase;

export default function FeedbackPage() {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [attachLogs, setAttachLogs] = useState(true);

  const handleSend = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入反馈内容');
      return;
    }

    setSending(true);
    try {
      let feedbackContent = content.trim();
      
      // 如果用户选择附上日志
      if (attachLogs) {
        const logs = await logger.getLogs(3);
        if (logs) {
          feedbackContent += '\n\n--- 应用日志 (最近3天) ---\n' + logs;
        }
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: feedbackContent }),
      });

      if (response.ok) {
        logger.info('反馈', '用户提交反馈成功');
        setSent(true);
        setContent('');
      } else {
        logger.error('反馈', new Error(`发送失败: ${response.status}`));
        Alert.alert('失败', '发送失败，请稍后重试');
      }
    } catch (error) {
      logger.error('反馈', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('失败', '网络错误，请检查网络连接');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <View className="flex-1 bg-white items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
            <Text className="text-4xl">✓</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2">提交成功</Text>
          <Text className="text-muted text-center mb-8">感谢您的反馈，我们会尽快处理</Text>
          <TouchableOpacity
            className="bg-indigo-500 rounded-2xl py-3 px-12"
            onPress={() => router.back()}
          >
            <Text className="text-white font-bold">退出</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 p-5">
          <Text className="text-lg font-bold text-foreground mb-2">问题描述</Text>
          <TextInput
            className="flex-1 bg-white rounded-2xl p-4 text-foreground"
            style={{ textAlignVertical: 'top' }}
            placeholder="请详细描述您遇到的问题..."
            placeholderTextColor="#9CA3AF"
            multiline
            value={content}
            onChangeText={setContent}
          />

          {/* 附上日志选项 */}
          <View className="flex-row items-center justify-between bg-white rounded-2xl p-4 mt-3">
            <View className="flex-1">
              <Text className="text-foreground font-medium">附上应用日志</Text>
              <Text className="text-muted text-xs mt-1">帮助开发者更快定位问题（最近3天）</Text>
            </View>
            <Switch
              value={attachLogs}
              onValueChange={setAttachLogs}
              trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
              thumbColor={attachLogs ? '#4F46E5' : '#F4F4F5'}
            />
          </View>

          <TouchableOpacity
            className="bg-indigo-500 rounded-2xl py-4 items-center mt-4"
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">发送</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
