import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

interface ImageItem {
  uri: string;
  url?: string;
}

export default function NoteEditPage() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ id?: number }>();
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isEditing = !!params.id;

  useEffect(() => {
    if (params.id) {
      fetchNote(params.id);
    }
  }, [params.id]);

  const fetchNote = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTitle(data.data.title);
        setContent(data.data.content || '');
        // 解析图片
        const imageUrls = extractImages(data.data.content);
        setImages(imageUrls.map(url => ({ uri: url, url })));
      }
    } catch (error) {
      console.error('Error fetching note:', error);
    }
  };

  // 从内容中提取图片 URL
  const extractImages = (text: string): string[] => {
    const regex = /!\[.*?\]\((.*?)\)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  };

  // 插入图片到内容
  const insertImageToContent = (imageUrl: string) => {
    const imageMarkdown = `\n![图片](${imageUrl})\n`;
    setContent(prev => prev + imageMarkdown);
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('提示', '需要相册权限来选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('错误', '选择图片失败');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('提示', '需要相机权限来拍照');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('错误', '拍照失败');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!token) {
      Alert.alert('提示', '请先登录');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${API_BASE}/api/v1/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.url) {
        const newImage = { uri, url: data.url };
        setImages(prev => [...prev, newImage]);
        insertImageToContent(data.url);
      } else {
        Alert.alert('错误', '上传图片失败');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('错误', '上传图片失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入标题');
      return;
    }

    setLoading(true);
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (isEditing && params.id) {
        await fetch(`${API_BASE}/api/v1/notes/${params.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ title, content }),
        });
      } else {
        await fetch(`${API_BASE}/api/v1/notes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title, content }),
        });
      }
      router.back();
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('错误', '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      '插入图片',
      '选择图片来源',
      [
        { text: '拍照', onPress: handleTakePhoto },
        { text: '相册', onPress: handlePickImage },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <FontAwesome6 name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">{isEditing ? '编辑笔记' : '新建笔记'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading || !title.trim()}
            className="px-4 py-2 rounded-full bg-accent"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-medium text-sm">保存</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View className="bg-white rounded-2xl p-4 mb-4"
              style={{
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="输入笔记标题..."
                placeholderTextColor="#9CA3AF"
                className="text-base font-medium text-foreground"
                style={{ outline: 'none' }}
              />
            </View>
          </Animated.View>

          {/* Images Preview */}
          {images.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).springify()} className="mb-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
                {images.map((img, index) => (
                  <View key={index} className="rounded-xl overflow-hidden" style={{ width: 100, height: 100 }}>
                    <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Content Input */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="bg-white rounded-2xl p-4 min-h-[300px]"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="输入笔记内容...\n\n提示：\n- 点击下方图片按钮可插入图片\n- 图片将自动上传并插入到内容中"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              className="text-base text-foreground min-h-[280px]"
              style={{ outline: 'none' }}
            />
          </Animated.View>
        </ScrollView>

        {/* Image Upload Button */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="px-5 pb-5">
          <TouchableOpacity
            onPress={showImageOptions}
            disabled={uploading}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-center gap-3"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text className="text-accent font-medium">上传中...</Text>
              </>
            ) : (
              <>
                <View className="w-10 h-10 rounded-xl bg-indigo-100 items-center justify-center">
                  <FontAwesome6 name="image" size={18} color="#4F46E5" />
                </View>
                <Text className="text-accent font-medium">插入图片</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
