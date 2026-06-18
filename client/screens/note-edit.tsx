import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import * as ImagePicker from 'expo-image-picker';
import { createFormDataFile } from '@/utils';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';
const DEEPSEEK_API_KEY = 'sk-5034bff7138d409dbf94f94c1be9440e';

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
  const [images, setImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const isEditing = !!params.id;

  useEffect(() => {
    if (params.id) {
      fetchNote(params.id);
    }
  }, [params.id]);

  const fetchNote = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notes/${id}`);
      const data = await res.json();
      if (data.success) {
        setTitle(data.data.title);
        setContent(data.data.content || '');
        if (data.data.images) {
          setImages(typeof data.data.images === 'string' ? JSON.parse(data.data.images) : data.data.images);
        }
      }
      // 获取评论
      const commentRes = await fetch(`${API_BASE}/api/v1/comments/note/${id}`);
      const commentData = await commentRes.json();
      if (Array.isArray(commentData)) {
        setComments(commentData);
      }
    } catch (error) {
      console.error('Error fetching note:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !params.id) return;
    setCommentLoading(true);
    try {
      const session = await AsyncStorage.getItem('supabase_session');
      const sessionData = session ? JSON.parse(session) : null;
      const userId = sessionData?.user?.id;
      const res = await fetch(`${API_BASE}/api/v1/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: parseInt(params.id), content: newComment, user_id: userId }),
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
      if (isEditing && params.id) {
        await fetch(`${API_BASE}/api/v1/notes/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, images: JSON.stringify(images) }),
        });
      } else {
        const session = await AsyncStorage.getItem('supabase_session');
        const sessionData = session ? JSON.parse(session) : null;
        const userId = sessionData?.user?.id;
        await fetch(`${API_BASE}/api/v1/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, images: JSON.stringify(images), user_id: userId }),
        });
      }
      router.back();
    } catch (error) {
      console.error('Error saving note:', error);
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

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
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
      </KeyboardAvoidingView>
    </Screen>
  );
}
