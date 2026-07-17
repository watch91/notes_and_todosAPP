import { View, Text, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

type ConfigKey = 'download_url' | 'new_version' | 'Version_beta_testing' | 'beta_version_download_URL';

export default function DevModePage() {
  const router = useSafeRouter();
  const [showModal, setShowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [modalType, setModalType] = useState<ConfigKey>('download_url');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const loadConfig = async (key: ConfigKey) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/version`);
      const data = await response.json();
      return data[key] || '';
    } catch {
      return '';
    }
  };

  const saveConfig = async (key: ConfigKey, value: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (response.ok) {
        Alert.alert('成功', '保存成功');
      } else {
        Alert.alert('错误', '保存失败');
      }
    } catch {
      Alert.alert('错误', '网络请求失败');
    }
    setLoading(false);
  };

  const handleOpenModal = async (type: ConfigKey) => {
    const value = await loadConfig(type);
    setModalType(type);
    setInputValue(value);
    setShowModal(true);
  };

  const handleSave = () => {
    saveConfig(modalType, inputValue);
    setShowModal(false);
  };

  const handleViewLogs = async () => {
    const logs = await logger.getLogs();
    setLogContent(logs || '暂无日志');
    setShowLogModal(true);
  };

  const handleClearLogs = async () => {
    Alert.alert('确认', '确定要清空所有日志吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          await logger.clear();
          setLogContent('暂无日志');
          Alert.alert('成功', '日志已清空');
        },
      },
    ]);
  };

  const handleClearStarryWisdomCache = async () => {
    Alert.alert('确认', '确定要清空星垂悟心缓存吗？\n清空后用户可重新生成今日星语', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('starryWisdomQuote');
            await AsyncStorage.removeItem('starryWisdomDate');
            Alert.alert('成功', '星垂悟心缓存已清空');
            logger.info('dev-mode', '清空星垂悟心缓存');
          } catch (error) {
            Alert.alert('错误', '清空缓存失败');
            logger.error('dev-mode', `清空星垂悟心缓存失败: ${error}`);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center px-5 pt-4 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <FontAwesome6 name="arrow-left" size={18} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground ml-2">开发者模式</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-5 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm"
          style={{
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => handleOpenModal('download_url')}
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
              <FontAwesome6 name="link" size={16} color="#3B82F6" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">链接</Text>
              <Text className="text-xs text-muted mt-0.5">修改 APK 下载链接</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenModal('new_version')}
            className="flex-row items-center px-5 py-4"
          >
            <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center">
              <FontAwesome6 name="tag" size={16} color="#10B981" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">版本</Text>
              <Text className="text-xs text-muted mt-0.5">修改最新版本号</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Beta 版本配置 */}
        <View className="mx-5 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm"
          style={{
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => handleOpenModal('Version_beta_testing')}
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
          >
            <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center">
              <FontAwesome6 name="flask" size={16} color="#F97316" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">Beta版本</Text>
              <Text className="text-xs text-muted mt-0.5">修改Beta测试版本号</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenModal('beta_version_download_URL')}
            className="flex-row items-center px-5 py-4"
          >
            <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center">
              <FontAwesome6 name="download" size={16} color="#EC4899" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">Beta下载链接</Text>
              <Text className="text-xs text-muted mt-0.5">修改Beta版本APK下载链接</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* 日志查看 */}
        <View className="mx-5 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm"
          style={{
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={handleViewLogs}
            className="flex-row items-center px-5 py-4"
          >
            <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
              <FontAwesome6 name="file-lines" size={16} color="#8B5CF6" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">查看日志</Text>
              <Text className="text-xs text-muted mt-0.5">查看应用运行日志</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* 星垂悟心缓存管理 */}
        <View className="mx-5 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm"
          style={{
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={handleClearStarryWisdomCache}
            className="flex-row items-center px-5 py-4"
          >
            <View className="w-10 h-10 rounded-xl bg-yellow-50 items-center justify-center">
              <FontAwesome6 name="star" size={16} color="#F59E0B" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-foreground">清空星垂悟心缓存</Text>
              <Text className="text-xs text-muted mt-0.5">清除后可重新生成今日星语</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        </ScrollView>

        <Modal visible={showModal} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white rounded-t-3xl p-5">
                <View className="flex-row items-center mb-4">
                  <Text className="text-lg font-bold flex-1">
                    {modalType === 'download_url' ? '修改链接' : 
                     modalType === 'new_version' ? '修改版本' :
                     modalType === 'Version_beta_testing' ? '修改Beta版本' :
                     '修改Beta下载链接'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <FontAwesome6 name="xmark" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-sm"
                  placeholder={
                    modalType === 'download_url' ? '输入下载链接' : 
                    modalType === 'new_version' ? '输入版本号' :
                    modalType === 'Version_beta_testing' ? '输入Beta版本号' :
                    '输入Beta下载链接'
                  }
                  value={inputValue}
                  onChangeText={setInputValue}
                  multiline={modalType === 'download_url' || modalType === 'beta_version_download_URL'}
                  numberOfLines={modalType === 'download_url' || modalType === 'beta_version_download_URL' ? 4 : 1}
                />

                <TouchableOpacity
                  className={`mt-4 rounded-xl py-4 ${loading ? 'bg-indigo-300' : 'bg-indigo-500'}`}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text className="text-white text-center font-bold">保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* 日志查看 Modal */}
        <Modal visible={showLogModal} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-5" style={{ maxHeight: '80%' }}>
              <View className="flex-row items-center mb-4">
                <Text className="text-lg font-bold flex-1">应用日志</Text>
                <TouchableOpacity onPress={handleClearLogs} className="mr-4">
                  <FontAwesome6 name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowLogModal(false)}>
                  <FontAwesome6 name="xmark" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView className="bg-gray-100 rounded-xl p-3" style={{ maxHeight: 400 }}>
                <Text className="text-xs text-gray-700 font-mono" selectable>
                  {logContent}
                </Text>
              </ScrollView>

              <TouchableOpacity
                className="mt-4 rounded-xl py-4 bg-indigo-500"
                onPress={() => setShowLogModal(false)}
              >
                <Text className="text-white text-center font-bold">关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

import { KeyboardAvoidingView, Platform } from 'react-native';
