import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { logger } from '@/utils/logger';
import { createFormDataFile } from '@/utils';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';
const DEEPSEEK_API_KEY = 'sk-5034bff7138d409dbf94f94c1be9440e';

// 标签对应关系（按照 assets/标签对应关系.txt）
const LABELS: Record<number, string> = {
  1: '随笔',
  2: '感悟',
  3: '知识',
  4: '攻略',
  5: '游戏',
  6: '影视',
  7: '读书',
  8: '美食',
  9: '旅行',
  10: '穿搭',
  11: '学习',
  12: '创作',
  13: '生活',
  14: '数码',
  15: '闲聊',
};

// 标签颜色
const LABEL_COLORS: Record<number, string> = {
  1: '#8B5CF6', 2: '#EC4899', 3: '#3B82F6', 4: '#10B981', 5: '#EF4444',
  6: '#F59E0B', 7: '#6366F1', 8: '#F97316', 9: '#14B8A6', 10: '#D946EF',
  11: '#0EA5E9', 12: '#8B5CF6', 13: '#22C55E', 14: '#64748B', 15: '#A855F7',
};

interface Picture {
  id: number;
  image_key: string;
  image_url: string;
  created_at: string;
}

export default function NoteEditPage() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ id?: number; title?: string; content?: string }>();
  const [title, setTitle] = useState(params.title || '');
  const [content, setContent] = useState(params.content || '');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [labels, setLabels] = useState<(number | null)[]>([null, null, null]);
  const [labelModalVisible, setLabelModalVisible] = useState(false);

  const isEditing = !!params.id;

  useEffect(() => {
    if (params.id) {
      logger.info('笔记编辑', `打开笔记: ID=${params.id}`);
      fetchNote(params.id);
    } else {
      logger.info('笔记编辑', '创建新笔记');
    }
  }, [params.id]);

  const fetchNote = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notes/${id}`);
      const data = await res.json();
      if (data.success) {
        setTitle(data.data.title);
        setContent(data.data.content || '');
        // 读取标签
        setLabels([
          data.data.label_1 ?? null,
          data.data.label_2 ?? null,
          data.data.label_3 ?? null,
        ]);
      }
      // 获取评论
      const commentRes = await fetch(`${API_BASE}/api/v1/comments/note/${id}`);
      const commentData = await commentRes.json();
      if (Array.isArray(commentData)) {
        setComments(commentData);
      }
      // 获取图片
      const picRes = await fetch(`${API_BASE}/api/v1/pictures/note/${id}`);
      const picData = await picRes.json();
      if (Array.isArray(picData)) {
        setPictures(picData);
      }
    } catch (error) {
      logger.error('笔记编辑', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !params.id) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: parseInt(String(params.id)), content: newComment }),
      });
      const data = await res.json();
      if (data.id) {
        setComments([...comments, data]);
        setNewComment('');
      } else {
        alert('评论失败，请重试');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('评论失败，请检查网络');
    }
    setCommentLoading(false);
  };

  const handleDeleteComment = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/v1/comments/${id}`, { method: 'DELETE' });
      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      const labelData = {
        label_1: labels[0],
        label_2: labels[1],
        label_3: labels[2],
      };
      if (isEditing && params.id) {
        logger.info('笔记编辑', `修改笔记: ${title}`);
        await fetch(`${API_BASE}/api/v1/notes/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, ...labelData }),
        });
      } else {
        logger.info('笔记编辑', `创建笔记: ${title}`);
        const userId = await AsyncStorage.getItem('user_id');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (userId) {
          headers['x-user-id'] = userId;
        }
        const res = await fetch(`${API_BASE}/api/v1/notes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title, content, ...labelData }),
        });
        const data = await res.json();
        // 如果有图片，需要关联到新创建的笔记
        if (data.id && pictures.length > 0) {
          for (const pic of pictures) {
            await fetch(`${API_BASE}/api/v1/pictures/${pic.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ note_id: data.id }),
            });
          }
        }
      }
      router.back();
    } catch (error) {
      logger.error('笔记编辑', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleAISummarize = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '笔记内容为空，无法总结');
      return;
    }
    setAiLoading(true);
    setAiResult('');
    setAiModalVisible(true);
    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: `请用尽可能最简洁的话总结下面的内容：\n\n${content}\n\n直接输出回答。` }],
        }),
      });
      const data = await res.json();
      if (data.choices && data.choices[0]) {
        setAiResult(data.choices[0].message.content);
      } else {
        setAiResult('AI 响应格式错误');
      }
    } catch (error) {
      setAiResult('请求失败，请检查网络');
    } finally {
      setAiLoading(false);
    }
  };

  // 标签选择相关函数
  const handleSelectLabel = (labelId: number) => {
    // 检查是否已选择该标签
    const existingIndex = labels.indexOf(labelId);
    if (existingIndex !== -1) {
      // 取消选择
      const newLabels = [...labels];
      newLabels[existingIndex] = null;
      // 重新整理数组，将 null 移到后面
      const sortedLabels: (number | null)[] = newLabels.filter(l => l !== null);
      while (sortedLabels.length < 3) sortedLabels.push(null);
      setLabels(sortedLabels);
    } else {
      // 添加标签
      const emptyIndex = labels.indexOf(null);
      if (emptyIndex !== -1) {
        const newLabels = [...labels];
        newLabels[emptyIndex] = labelId;
        setLabels(newLabels);
      } else {
        Alert.alert('提示', '最多只能选择3个标签');
      }
    }
  };

  const handleRemoveLabel = (index: number) => {
    const newLabels = [...labels];
    newLabels[index] = null;
    // 重新整理数组，将 null 移到后面
    const sortedLabels: (number | null)[] = newLabels.filter(l => l !== null);
    while (sortedLabels.length < 3) sortedLabels.push(null);
    setLabels(sortedLabels);
  };

  const handlePickImage = async () => {
    if (!params.id) {
      Alert.alert('提示', '请先保存笔记后再添加图片');
      return;
    }

    try {
      // 请求相册权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相册权限才能选择图片');
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
      logger.error('笔记编辑', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('错误', '选择图片失败');
    }
  };

  const handleTakePhoto = async () => {
    if (!params.id) {
      Alert.alert('提示', '请先保存笔记后再添加图片');
      return;
    }

    try {
      // 请求相机权限
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('笔记编辑', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('错误', '拍照失败');
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    logger.info('图片上传', `开始上传: note_id=${params.id}, uri=${uri.substring(0, 50)}...`);
    try {
      const formData = new FormData();
      const formDataFile = await createFormDataFile(uri, `image_${Date.now()}.jpg`, 'image/jpeg');
      formData.append('file', formDataFile as any);
      formData.append('note_id', String(params.id));

      const res = await fetch(`${API_BASE}/api/v1/pictures`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPictures([...pictures, data.data]);
        logger.info('图片上传', `上传成功: id=${data.data.id}, image_key=${data.data.image_key}`);
      } else {
        logger.error('图片上传', new Error(`上传失败: ${data.error || '未知错误'}`));
        Alert.alert('错误', data.error || '上传失败');
      }
    } catch (error) {
      logger.error('图片上传', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('错误', '上传失败，请检查网络');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePicture = async (pic: Picture) => {
    Alert.alert(
      '确认删除',
      '确定要删除这张图片吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            logger.info('图片删除', `开始删除: id=${pic.id}, image_key=${pic.image_key}`);
            try {
              const res = await fetch(`${API_BASE}/api/v1/pictures/${pic.id}`, { method: 'DELETE' });
              const data = await res.json();
              if (data.message || res.ok) {
                setPictures(pictures.filter(p => p.id !== pic.id));
                logger.info('图片删除', `删除成功: id=${pic.id}`);
              } else {
                logger.error('图片删除', new Error(`删除失败: ${data.error || '未知错误'}`));
                Alert.alert('错误', data.error || '删除失败');
              }
            } catch (error) {
              logger.error('图片删除', error instanceof Error ? error : new Error(String(error)));
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  const renderPicture = ({ item }: { item: Picture }) => (
    <View className="relative mr-2 mb-2">
      <Image
        source={{ uri: item.image_url }}
        style={{ width: 100, height: 100, borderRadius: 8 }}
        resizeMode="cover"
      />
      {!isReadOnly && (
        <TouchableOpacity
          onPress={() => handleDeletePicture(item)}
          className="absolute top-1 right-1 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
        >
          <FontAwesome6 name="xmark" size={12} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <FontAwesome6 name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">
            {isReadOnly && isEditing ? '阅读模式' : (isEditing ? '编辑笔记' : '新建笔记')}
          </Text>
          {isReadOnly && isEditing ? (
            <TouchableOpacity
              onPress={() => setIsReadOnly(false)}
              className="px-4 py-2 rounded-full bg-accent"
            >
              <Text className="text-white font-medium text-sm">编辑</Text>
            </TouchableOpacity>
          ) : (
            <>
              {content.trim() && (
                <TouchableOpacity
                  onPress={handleAISummarize}
                  className="p-2 -mr-2"
                >
                  <FontAwesome6 name="wand-magic-sparkles" size={18} color="#4F46E5" /><Text className="text-xs text-indigo-600 ml-1">一键总结</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading || !title.trim()}
                className="px-4 py-2 rounded-full bg-accent"
              >
                <Text className="text-white font-medium text-sm">保存</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View className="bg-white rounded-2xl p-4 mb-4"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {isReadOnly && isEditing ? (
              <Text className="text-base font-medium text-foreground">{title || '无标题'}</Text>
            ) : (
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="输入笔记标题..."
                placeholderTextColor="#9CA3AF"
                className="text-base font-medium text-foreground"
                style={{ outline: 'none' }}
              />
            )}
          </View>

          {/* Labels */}
          {(labels.filter(l => l !== null).length > 0 || !isReadOnly) && (
            <View className="bg-white rounded-2xl p-4 mb-4"
              style={{
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-gray-600">标签</Text>
                {!isReadOnly && (
                  <TouchableOpacity
                    onPress={() => setLabelModalVisible(true)}
                    className="flex-row items-center bg-indigo-100 px-3 py-1.5 rounded-full"
                  >
                    <FontAwesome6 name="tags" size={12} color="#4F46E5" />
                    <Text className="text-xs text-indigo-600 ml-1.5">选择标签</Text>
                  </TouchableOpacity>
                )}
              </View>
              {labels.filter(l => l !== null).length > 0 && (
                <View className="flex-row flex-wrap mt-3">
                  {labels.filter(l => l !== null).map((labelId, index) => (
                    <View
                      key={index}
                      className="flex-row items-center mr-2 mb-2 px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: LABEL_COLORS[labelId as number] + '20' }}
                    >
                      <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: LABEL_COLORS[labelId as number] }} />
                      <Text className="text-xs" style={{ color: LABEL_COLORS[labelId as number] }}>
                        {LABELS[labelId as number]}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Content */}
          <View className="bg-white rounded-2xl p-4 min-h-[300px]"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {isReadOnly && isEditing ? (
              <Text className="text-base text-foreground whitespace-pre-wrap">{content || '无内容'}</Text>
            ) : (
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="输入笔记内容..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                className="text-base text-foreground min-h-[280px]"
                style={{ outline: 'none' }}
              />
            )}
          </View>

          {/* Pictures Section */}
          {(pictures.length > 0 || (!isReadOnly && params.id)) && (
            <View className="mt-4">
              <Text className="text-base font-semibold text-foreground mb-3">图片附件 ({pictures.length})</Text>
              
              {/* Picture Grid */}
              {pictures.length > 0 && (
                <View className="flex-row flex-wrap">
                  {pictures.map(pic => (
                    <View key={pic.id} className="relative mr-2 mb-2">
                      <TouchableOpacity
                        onPress={() => isReadOnly && setFullscreenImage(pic.image_url)}
                        disabled={!isReadOnly}
                      >
                        <Image
                          source={{ uri: pic.image_url }}
                          style={{ width: 100, height: 100, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      {!isReadOnly && (
                        <TouchableOpacity
                          onPress={() => handleDeletePicture(pic)}
                          className="absolute top-1 right-1 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                        >
                          <FontAwesome6 name="xmark" size={12} color="white" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Add Picture Buttons */}
              {!isReadOnly && params.id && (
                <View className="flex-row mt-2">
                  <TouchableOpacity
                    onPress={handlePickImage}
                    disabled={uploading}
                    className="flex-row items-center bg-indigo-100 px-4 py-2 rounded-xl mr-2"
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                      <FontAwesome6 name="image" size={16} color="#4F46E5" />
                    )}
                    <Text className="text-indigo-600 ml-2 text-sm font-medium">
                      {uploading ? '上传中...' : '选择图片'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleTakePhoto}
                    disabled={uploading}
                    className="flex-row items-center bg-indigo-100 px-4 py-2 rounded-xl"
                  >
                    <FontAwesome6 name="camera" size={16} color="#4F46E5" />
                    <Text className="text-indigo-600 ml-2 text-sm font-medium">拍照</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* 评论区域 */}
          {isReadOnly && isEditing && (
            <View className="mt-4 px-1">
              <Text className="text-base font-semibold text-foreground mb-3">评论 ({comments.length})</Text>
              {comments.map(comment => (
                <View key={comment.id} className="bg-white rounded-xl p-3 mb-2 flex-row items-center">
                  <Text className="flex-1 text-sm text-foreground">{comment.content}</Text>
                  <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} className="ml-2">
                    <FontAwesome6 name="trash" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              <View className="flex-row items-center mt-3">
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="添加评论..."
                  className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm text-foreground border border-gray-200"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  disabled={commentLoading || !newComment.trim()}
                  className="ml-2 bg-indigo-500 px-4 py-2.5 rounded-xl"
                >
                  <Text className="text-white text-sm font-medium">发送</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* AI Summary Modal */}
        <Modal visible={aiModalVisible} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center p-5">
            <View className="bg-white rounded-2xl w-full max-h-[70%] p-5">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-foreground">一键总结</Text>
                <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                  <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              {aiLoading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text className="mt-3 text-muted">AI 思考中...</Text>
                </View>
              ) : (
                <ScrollView className="max-h-[400]">
                  <Text className="text-foreground leading-6">{aiResult}</Text>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Fullscreen Image Modal */}
        <Modal visible={!!fullscreenImage} transparent animationType="fade">
          <View className="flex-1 bg-black justify-center items-center">
            <TouchableOpacity
              onPress={() => setFullscreenImage(null)}
              className="absolute top-12 right-5 bg-black/50 rounded-full w-10 h-10 items-center justify-center z-10"
            >
              <FontAwesome6 name="xmark" size={20} color="white" />
            </TouchableOpacity>
            <Image
              source={{ uri: fullscreenImage || '' }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          </View>
        </Modal>

        {/* Label Selection Modal */}
        <Modal
          visible={labelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLabelModalVisible(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[80%]">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-lg font-bold text-foreground">选择标签</Text>
                <TouchableOpacity onPress={() => setLabelModalVisible(false)}>
                  <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View className="p-2 mb-2">
                <Text className="text-xs text-gray-500 px-2">
                  已选择 {labels.filter(l => l !== null).length}/3 个标签
                </Text>
              </View>
              <ScrollView className="px-4 pb-8" showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap">
                  {Object.entries(LABELS).map(([id, name]) => {
                    const labelId = parseInt(id);
                    const isSelected = labels.includes(labelId);
                    return (
                      <TouchableOpacity
                        key={id}
                        onPress={() => handleSelectLabel(labelId)}
                        className="m-1 px-3 py-2 rounded-full"
                        style={{
                          backgroundColor: isSelected ? LABEL_COLORS[labelId] : LABEL_COLORS[labelId] + '20',
                        }}
                      >
                        <Text
                          className="text-sm"
                          style={{ color: isSelected ? '#fff' : LABEL_COLORS[labelId] }}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}
