import { Screen } from '@/components/Screen';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function FeedbackPage() {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入反馈内容');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (response.ok) {
        setSent(true);
        setContent('');
      } else {
        Alert.alert('失败', '发送失败，请稍后重试');
      }
    } catch (error) {
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
