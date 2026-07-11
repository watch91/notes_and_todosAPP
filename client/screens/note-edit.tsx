import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Markdown from 'react-native-markdown-display';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { logger } from '@/utils/logger';
import { createFormDataFile } from '@/utils';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';
const DEEPSEEK_API_KEY = 'sk-5034bff7138d409dbf94f94c1be9440e';

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
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showEditModal, setShowEditModal] = useState(false);
  const contentInputRef = useRef<TextInput>(null);

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

  // Markdown 工具栏插入功能
  const insertMarkdown = (before: string, after: string = '') => {
    const start = selection.start;
    const end = selection.end;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
    // 设置光标位置
    setTimeout(() => {
      if (selectedText) {
        setSelection({ start: start + before.length, end: start + before.length + selectedText.length });
      } else {
        setSelection({ start: start + before.length, end: start + before.length });
      }
    }, 0);
  };

  const insertLinePrefix = (prefix: string) => {
    const start = selection.start;
    // 找到当前行的开始位置
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    setContent(newContent);
    setTimeout(() => {
      setSelection({ start: start + prefix.length, end: start + prefix.length });
    }, 0);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      if (isEditing && params.id) {
        logger.info('笔记编辑', `修改笔记: ${title}`);
        await fetch(`${API_BASE}/api/v1/notes/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        });
      } else {
        logger.info('笔记编辑', `创建笔记: ${title}`);
        const res = await fetch(`${API_BASE}/api/v1/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
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
        logger.info('笔记编辑', '图片上传成功');
      } else {
        Alert.alert('错误', data.error || '上传失败');
      }
    } catch (error) {
      logger.error('笔记编辑', error instanceof Error ? error : new Error(String(error)));
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
            try {
              await fetch(`${API_BASE}/api/v1/pictures/${pic.id}`, { method: 'DELETE' });
              setPictures(pictures.filter(p => p.id !== pic.id));
              logger.info('笔记编辑', '图片删除成功');
            } catch (error) {
              logger.error('笔记编辑', error instanceof Error ? error : new Error(String(error)));
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
              <Markdown style={markdownStyles}>{content || '无内容'}</Markdown>
            ) : (
              <>
                {/* Markdown 工具栏 */}
                <View className="flex-row flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100">
                  <TouchableOpacity
                    onPress={() => insertMarkdown('**', '**')}
                    className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center"
                  >
                    <Text className="text-base font-bold text-gray-700">B</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => insertMarkdown('*', '*')}
                    className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center"
                  >
                    <Text className="text-base italic text-gray-700">I</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => insertMarkdown('~~', '~~')}
                    className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center"
                  >
                    <Text className="text-base line-through text-gray-700">S</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => insertLinePrefix('---')}
                    className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center"
                  >
                    <View className="w-5 h-0.5 bg-gray-700" />
                  </TouchableOpacity>
                </View>
                {/* Markdown 渲染预览 */}
                <TouchableOpacity
                  onPress={() => setShowEditModal(true)}
                  activeOpacity={0.7}
                  className="min-h-[250px]"
                >
                  <Markdown style={markdownStyles}>{content || '点击编辑内容...'}</Markdown>
                </TouchableOpacity>
                
                {/* 编辑提示 */}
                <View className="mt-3 p-3 bg-blue-50 rounded-lg flex-row items-center">
                  <FontAwesome6 name="info-circle" size={14} color="#3B82F6" />
                  <Text className="text-sm text-blue-600 ml-2">点击内容区域进行编辑</Text>
                </View>
              </>
            )}
          </View>

          {/* Markdown 编辑 Modal */}
          <Modal
            visible={showEditModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowEditModal(false)}
          >
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white rounded-t-3xl max-h-[80%]">
                <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                  <Text className="text-lg font-bold text-foreground">编辑内容</Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)}>
                    <FontAwesome6 name="check" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder="输入笔记内容（支持 Markdown 语法）..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                  className="text-base text-foreground p-4 min-h-[300px]"
                  style={{ outline: 'none' }}
                  autoFocus
                />
                <View className="p-4 border-t border-gray-200">
                  <Text className="text-xs text-gray-500 mb-2">支持的语法：</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Text className="text-xs text-gray-600">**加粗**</Text>
                    <Text className="text-xs text-gray-600">*斜体*</Text>
                    <Text className="text-xs text-gray-600">~~删除线~~</Text>
                    <Text className="text-xs text-gray-600">--- 分割线</Text>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

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
      </KeyboardAvoidingView>
    </Screen>
  );
}

const markdownStyles = {
  body: {
    color: '#1e293b',
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    color: '#1e293b',
    fontSize: 28,
    fontWeight: 'bold' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: '#1e293b',
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginTop: 14,
    marginBottom: 7,
  },
  heading3: {
    color: '#1e293b',
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    color: '#1e293b',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 4,
    marginBottom: 4,
  },
  strong: {
    fontWeight: 'bold' as const,
    color: '#1e293b',
  },
  em: {
    fontStyle: 'italic' as const,
    color: '#1e293b',
  },
  s: {
    textDecorationLine: 'line-through' as const,
    color: '#64748b',
  },
  code: {
    backgroundColor: '#f1f5f9',
    color: '#e11d48',
    fontFamily: 'monospace',
    fontSize: 14,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_inline: {
    backgroundColor: '#f1f5f9',
    color: '#e11d48',
    fontFamily: 'monospace',
    fontSize: 14,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  list_item: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginVertical: 4,
  },
  bullet_list: {
    marginLeft: 8,
    marginVertical: 4,
  },
  ordered_list: {
    marginLeft: 8,
    marginVertical: 4,
  },
  link: {
    color: '#3b82f6',
    textDecorationLine: 'underline' as const,
  },
  blockquote: {
    backgroundColor: '#f8fafc',
    borderColor: '#3b82f6',
    borderWidth: 2,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    marginLeft: 0,
  },
  hr: {
    backgroundColor: '#e2e8f0',
    height: 1,
    marginVertical: 16,
  },
  table: {
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
  },
  th: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: 8,
    fontWeight: 'bold' as const,
  },
  td: {
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: 8,
  },
};
