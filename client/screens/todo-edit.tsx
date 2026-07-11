import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function TodoEditPage() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ id?: number; title?: string; content?: string; due_date?: string }>();
  const [title, setTitle] = useState(params.title || params.content || '');
  const [dueDate, setDueDate] = useState<Date | null>(params.due_date ? new Date(params.due_date) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!params.id;

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      const due_date = dueDate ? dueDate.toISOString() : null;
      if (isEditing && params.id) {
        await fetch(`${API_BASE}/api/v1/todos/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, due_date }),
        });
      } else {
        await fetch(`${API_BASE}/api/v1/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, due_date }),
        });
      }
      router.back();
    } catch (error) {
      console.error('Error saving todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const clearDate = () => {
    setDueDate(null);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
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

          {/* 任务时间选择 */}
          <View className="mt-4 bg-white rounded-2xl p-4"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center">
                  <FontAwesome6 name="calendar" size={18} color="#3B82F6" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-muted">任务时间（选填）</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <Text className="text-base text-foreground mt-1">
                      {dueDate ? formatDate(dueDate) : '点击设置时间'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {dueDate && (
                <TouchableOpacity onPress={clearDate} className="p-2">
                  <FontAwesome6 name="times-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text className="text-sm text-muted mt-4 text-center">
            {isEditing ? '修改你的待办事项' : '添加一个新的待办事项'}
          </Text>
        </View>

        {/* 日期选择器 */}
        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            locale="zh-CN"
          />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
