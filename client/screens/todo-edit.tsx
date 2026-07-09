import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function TodoEditPage() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ id?: number; title?: string; content?: string }>();
  const [title, setTitle] = useState(params.title || params.content || '');
  const [loading, setLoading] = useState(false);

  const isEditing = !!params.id;

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      if (isEditing && params.id) {
        await fetch(`${API_BASE}/api/v1/todos/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
      } else {
        await fetch(`${API_BASE}/api/v1/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
      }
      router.back();
    } catch (error) {
      console.error('Error saving todo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <FontAwesome6 name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">{isEditing ? '编辑待办' : '新建待办'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading || !title.trim()}
            className="px-4 py-2 rounded-full bg-accent"
          >
            <Text className="text-white font-medium text-sm">保存</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="px-5 py-4">
          <View className="bg-white rounded-2xl p-4"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center">
                <FontAwesome6 name="check" size={18} color="#10B981" />
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="输入待办事项..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-3 text-base text-foreground"
                style={{ outline: 'none' }}
                autoFocus
              />
            </View>
          </View>

          <Text className="text-sm text-muted mt-4 text-center">
            {isEditing ? '修改你的待办事项' : '添加一个新的待办事项'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
