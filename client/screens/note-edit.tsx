import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert, Image, Linking } from 'react-native';
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

// 解析文本中的网址并渲染为可点击链接
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/\S+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <Text
          key={index}
          style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
          onPress={() => Linking.openURL(part)}
        >
          {part}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
};

export default function NoteEditPage() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ id?: number; title?: string; content?: string }>();
  const [title, setTitle] = useState(params.title || '');
  const [content, setContent] = useState(params.content || '');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiStreamText, setAiStreamText] = useState('');
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [aiAssistantVisible, setAiAssistantVisible] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [labels, setLabels] = useState<(number | null)[]>([null, null, null]);
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [noteAuthor, setNoteAuthor] = useState<string | null>(null);
  const [noteAuthorName, setNoteAuthorName] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [collaborators, setCollaborators] = useState<{ user_id: string; user_name: string }[]>([]);
  const [collaboratorModalVisible, setCollaboratorModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ user_id: string; user_name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [noteInfoModalVisible, setNoteInfoModalVisible] = useState(false);
  const [noteCreatedAt, setNoteCreatedAt] = useState<string>('');
  const [noteUpdatedAt, setNoteUpdatedAt] = useState<string>('');

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
        // 保存作者ID
        setNoteAuthor(data.data.user || null);
        // 保存作者昵称
        setNoteAuthorName(data.data.author_name || null);
        // 保存协作者列表
        setCollaborators(data.data.collaborators || []);
        // 保存创建/更新时间
        setNoteCreatedAt(data.data.created_at || '');
        setNoteUpdatedAt(data.data.updated_at || '');
        // 检查当前用户是否有编辑权限
        // 匿名笔记：任何人都有编辑权限
        // 非匿名笔记：只有作者或协作者有编辑权限
        const currentUserId = await AsyncStorage.getItem('user_id');
        const isAnonymous = !data.data.user;
        const isActualAuthor = currentUserId === data.data.user;
        const isCollaborator = (data.data.collaborators || []).some(
          (c: { user_id: string }) => c.user_id === currentUserId
        );
        setIsAuthor(isAnonymous || isActualAuthor);
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

  // 打开 AI 写作助手弹窗
  const handleOpenAiAssistant = () => {
    setAiInstruction('');
    setAiStreamText('');
    setAiAssistantVisible(true);
  };

  // 关闭 AI 写作助手弹窗
  const handleCloseAiAssistant = () => {
    if (aiAssistantLoading) return;
    setAiAssistantVisible(false);
    setAiInstruction('');
    setAiStreamText('');
  };

  // 从 LLM 输出中提取 {output:"..."} 中的完整内容
  const extractOutputFromText = (text: string): string => {
    // 1) 尝试 JSON 解析
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj.output === 'string') return obj.output;
    } catch {
      // ignore
    }
    // 2) 去除 markdown 代码块再试一次
    const trimmed = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj.output === 'string') return obj.output;
    } catch {
      // ignore
    }
    // 3) 正则提取
    const match = text.match(/\{\s*output\s*:\s*"([\s\S]*?)"\s*\}/);
    if (match) {
      try {
        return JSON.parse(`"${match[1]}"`);
      } catch {
        return match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    }
    // 4) 兜底：返回原文
    return text;
  };

  // 发送指令，流式获取 AI 输出
  const handleSendAiInstruction = async () => {
    const instruction = aiInstruction.trim();
    if (!instruction) {
      Alert.alert('提示', '请输入你的写作需求');
      return;
    }
    setAiAssistantLoading(true);
    setAiStreamText('');
    const ctrl = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/api/v1/notes/ai-assistant/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentContent: content || '', userInstruction: instruction }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`请求失败: ${res.status}`);
      }
      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          buffer += decoder.decode(result.value, { stream: true });
          // 按 \n\n 切分事件
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const line = rawEvent.replace(/^data:\s*/, '').trim();
            if (!line) continue;
            if (line === '[DONE]') {
              done = true;
              break;
            }
            if (line.startsWith('__END__')) {
              const parsed = line.slice('__END__'.length);
              setAiStreamText(parsed);
            } else if (line.startsWith('__ERROR__')) {
              setAiStreamText((prev) => prev + `\n[错误] ${line.slice('__ERROR__'.length)}`);
            } else {
              setAiStreamText((prev) => prev + line);
            }
          }
        }
      }
      // 兜底解析
      setAiStreamText((prev) => extractOutputFromText(prev));
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        Alert.alert('错误', err?.message || 'AI 请求失败');
      }
    } finally {
      setAiAssistantLoading(false);
    }
  };

  // 把 AI 输出应用到笔记
  const handleApplyAiResult = () => {
    const text = extractOutputFromText(aiStreamText);
    if (!text) {
      Alert.alert('提示', '暂无内容可应用');
      return;
    }
    setContent(text);
    setAiAssistantVisible(false);
    setAiInstruction('');
    setAiStreamText('');
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

  // 检查是否有编辑权限（作者、协作者可以编辑，匿名笔记任何人都可以编辑）
  const handleEditPress = async () => {
    if (!params.id) return;
    
    // 匿名笔记：任何人都可以编辑
    if (!noteAuthor) {
      setIsReadOnly(false);
      return;
    }
    
    // 获取当前登录用户ID
    const currentUserId = await AsyncStorage.getItem('user_id');
    
    // 检查权限：未登录
    if (!currentUserId) {
      Alert.alert('提示', '您无进行此操作的权限，请在"我的"→"设置"→"登录/注册"中登录您的账号后尝试');
      return;
    }
    
    // 检查是否是作者或协作者
    const isAuthor = currentUserId === noteAuthor;
    const isCollaborator = collaborators.some(c => c.user_id === currentUserId);
    
    if (!isAuthor && !isCollaborator) {
      Alert.alert('提示', '您无进行此操作的权限，因为您并非该笔记的作者或协作者');
      return;
    }
    
    // 有权限，切换到编辑模式
    setIsReadOnly(false);
  };

  // 搜索用户（用于添加协作者）
  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      /**
       * 服务端文件：server/src/routes/notes.ts
       * 接口：GET /api/v1/notes/search/users
       * Query 参数：q: string
       */
      const res = await fetch(`${API_BASE}/api/v1/notes/search/users?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        // 过滤掉已经是协作者的用户和作者
        const currentUserId = await AsyncStorage.getItem('user_id');
        const filtered = data.data.filter((u: any) => 
          u.user_id !== noteAuthor && 
          !collaborators.some(c => c.user_id === u.user_id) &&
          u.user_id !== currentUserId
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Search users error:', error);
    } finally {
      setSearching(false);
    }
  };

  // 添加协作者
  const handleAddCollaborator = async (userId: string, userName: string) => {
    if (!params.id) return;
    
    try {
      const currentUserId = await AsyncStorage.getItem('user_id');
      /**
       * 服务端文件：server/src/routes/notes.ts
       * 接口：POST /api/v1/notes/:id/collaborators
       * Body 参数：user_id: string
       * Header：x-user-id: string
       */
      const res = await fetch(`${API_BASE}/api/v1/notes/${params.id}/collaborators`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUserId || '',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      
      const data = await res.json();
      if (data.success) {
        setCollaborators([...collaborators, { user_id: userId, user_name: userName }]);
        setSearchResults(searchResults.filter(u => u.user_id !== userId));
        setSearchQuery('');
        Alert.alert('成功', `已添加 ${userName} 为协作者`);
      } else {
        Alert.alert('错误', data.error || '添加协作者失败');
      }
    } catch (error) {
      console.error('Add collaborator error:', error);
      Alert.alert('错误', '添加协作者失败');
    }
  };

  // 删除协作者
  const handleRemoveCollaborator = async (userId: string, userName: string) => {
    if (!params.id) return;
    
    Alert.alert(
      '确认删除',
      `确定要移除协作者 ${userName} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUserId = await AsyncStorage.getItem('user_id');
              /**
               * 服务端文件：server/src/routes/notes.ts
               * 接口：DELETE /api/v1/notes/:id/collaborators/:userId
               * Header：x-user-id: string
               */
              const res = await fetch(`${API_BASE}/api/v1/notes/${params.id}/collaborators/${userId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': currentUserId || '' },
              });
              
              const data = await res.json();
              if (data.success) {
                setCollaborators(collaborators.filter(c => c.user_id !== userId));
                Alert.alert('成功', `已移除协作者 ${userName}`);
              } else {
                Alert.alert('错误', data.error || '删除协作者失败');
              }
            } catch (error) {
              console.error('Remove collaborator error:', error);
              Alert.alert('错误', '删除协作者失败');
            }
          },
        },
      ]
    );
  };

  // 打开协作者管理弹窗
  const handleOpenCollaboratorModal = async () => {
    setCollaboratorModalVisible(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  // 检查当前用户是否是作者（用于协作者弹窗中的权限控制）
  // 匿名笔记：任何人都可以管理协作者
  const checkIsAuthor = async () => {
    if (!noteAuthor) return true; // 匿名笔记，任何人都有权限
    const currentUserId = await AsyncStorage.getItem('user_id');
    return currentUserId === noteAuthor;
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
            <View className="flex-row items-center">
              {content.trim() && (
                <TouchableOpacity
                  onPress={handleAISummarize}
                  className="flex-row items-center px-3 py-2 mr-2 rounded-full bg-white"
                  style={{
                    borderWidth: 2,
                    borderColor: '#C084FC',
                    boxShadow: '0 2px 8px rgba(192, 132, 252, 0.3)',
                  }}
                >
                  <FontAwesome6 name="wand-magic-sparkles" size={14} color="#8B5CF6" />
                  <Text className="text-xs text-purple-600 ml-1.5 font-medium">AI 总结</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setNoteInfoModalVisible(true)}
                className="flex-row items-center px-3 py-2 mr-2 rounded-full bg-gray-100"
              >
                <FontAwesome6 name="circle-info" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 ml-1">笔记信息</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditPress}
                className="px-4 py-2 rounded-full bg-accent"
              >
                <Text className="text-white font-medium text-sm">编辑</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {isEditing && (
                <TouchableOpacity
                  onPress={handleOpenCollaboratorModal}
                  className="flex-row items-center px-3 py-2 mr-2 rounded-full bg-indigo-100"
                >
                  <FontAwesome6 name="user-group" size={14} color="#4F46E5" />
                  <Text className="text-xs text-indigo-600 ml-1">协作者({collaborators.length})</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleOpenAiAssistant}
                disabled={aiAssistantLoading}
                className="flex-row items-center px-3 py-2 mr-2 rounded-full bg-purple-100"
                style={{
                  borderWidth: 2,
                  borderColor: '#C084FC',
                  opacity: aiAssistantLoading ? 0.6 : 1,
                }}
              >
                <FontAwesome6 name="wand-magic-sparkles" size={14} color="#8B5CF6" />
                <Text className="text-xs text-purple-600 ml-1 font-medium">AI 写作助手</Text>
              </TouchableOpacity>
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

          {/* Labels - Only show in edit mode */}
          {!isReadOnly && (
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
                {!isReadOnly && isAuthor && (
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
              <Text className="text-base text-foreground whitespace-pre-wrap">{content ? renderTextWithLinks(content) : '无内容'}</Text>
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

        {/* Note Info Modal */}
        <Modal
          visible={noteInfoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNoteInfoModalVisible(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center p-5">
            <View className="bg-white rounded-2xl w-full max-w-[400px]">
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-lg font-bold text-foreground">笔记信息</Text>
                <TouchableOpacity onPress={() => setNoteInfoModalVisible(false)}>
                  <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View className="p-4">
                {/* Author */}
                <View className="flex-row items-center mb-3">
                  <FontAwesome6 name="user" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">作者：</Text>
                  <Text className="text-sm text-foreground font-medium ml-1">
                    {noteAuthorName ? `${noteAuthorName}(${noteAuthor})` : (noteAuthor ? `用户${noteAuthor}` : '匿名用户')}
                  </Text>
                </View>

                {/* Collaborators */}
                <View className="flex-row items-center mb-3">
                  <FontAwesome6 name="user-group" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">协作者：</Text>
                  <Text className="text-sm text-foreground ml-1">
                    {collaborators.length > 0 ? collaborators.map(c => `${c.user_name}(${c.user_id})`).join('、') : '无'}
                  </Text>
                </View>

                {/* Created Time */}
                <View className="flex-row items-center mb-3">
                  <FontAwesome6 name="calendar-plus" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">创建时间：</Text>
                  <Text className="text-sm text-foreground ml-1">
                    {noteCreatedAt ? new Date(noteCreatedAt).toLocaleString('zh-CN') : '未知'}
                  </Text>
                </View>

                {/* Updated Time */}
                <View className="flex-row items-center mb-3">
                  <FontAwesome6 name="calendar-check" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">修改时间：</Text>
                  <Text className="text-sm text-foreground ml-1">
                    {noteUpdatedAt ? new Date(noteUpdatedAt).toLocaleString('zh-CN') : '未知'}
                  </Text>
                </View>

                {/* Word Count */}
                <View className="flex-row items-center mb-3">
                  <FontAwesome6 name="font" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">字数：</Text>
                  <Text className="text-sm text-foreground ml-1">{content.length}</Text>
                </View>

                {/* Labels */}
                <View className="flex-row items-start">
                  <FontAwesome6 name="tags" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">标签：</Text>
                  <View className="flex-row flex-wrap flex-1 ml-1">
                    {labels.filter(l => l !== null).length > 0 ? (
                      labels.filter(l => l !== null).map((labelId, index) => (
                        <View
                          key={index}
                          className="flex-row items-center mr-2 mb-1 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: LABEL_COLORS[labelId as number] + '20' }}
                        >
                          <Text className="text-xs" style={{ color: LABEL_COLORS[labelId as number] }}>
                            {LABELS[labelId as number]}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-sm text-foreground">无</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Collaborator Management Modal */}
        <Modal
          visible={collaboratorModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCollaboratorModalVisible(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center p-5">
            <View className="bg-white rounded-2xl w-full max-h-[70%]">
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-lg font-bold text-foreground">{isAuthor ? '协作者管理' : '协作者列表'}</Text>
                <TouchableOpacity onPress={() => setCollaboratorModalVisible(false)}>
                  <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                {/* Current Collaborators */}
                <Text className="text-sm font-medium text-gray-600 mb-2">当前协作者 ({collaborators.length})</Text>
                {collaborators.length === 0 ? (
                  <Text className="text-sm text-gray-400 mb-4">暂无协作者</Text>
                ) : (
                  <View className="mb-4">
                    {collaborators.map((collab) => (
                      <View key={collab.user_id} className="flex-row items-center justify-between py-2 border-b border-gray-100">
                        <View className="flex-row items-center flex-1">
                          <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center mr-2">
                            <FontAwesome6 name="user" size={14} color="#4F46E5" />
                          </View>
                          <Text className="text-sm text-foreground flex-1">{collab.user_name}</Text>
                        </View>
                        {isAuthor && (
                          <TouchableOpacity
                            onPress={() => handleRemoveCollaborator(collab.user_id, collab.user_name)}
                            className="px-3 py-1 rounded-full bg-red-100"
                          >
                            <Text className="text-xs text-red-500">移除</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Search and Add - Only for author */}
                {isAuthor && (
                  <>
                    <Text className="text-sm font-medium text-gray-600 mb-2">添加协作者</Text>
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mb-2">
                      <FontAwesome6 name="users" size={14} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-2 text-sm text-foreground"
                        placeholder="搜索用户昵称..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={(text) => {
                          setSearchQuery(text);
                          handleSearchUsers(text);
                        }}
                        style={{ outline: 'none' }}
                      />
                    </View>

                    {searching && (
                      <View className="py-2 items-center">
                        <ActivityIndicator size="small" color="#4F46E5" />
                      </View>
                    )}

                    {!searching && searchQuery && searchResults.length === 0 && (
                      <Text className="text-sm text-gray-400 text-center py-2">未找到用户</Text>
                    )}

                    {searchResults.map((user) => (
                      <View key={user.user_id} className="flex-row items-center justify-between py-2 border-b border-gray-100">
                        <View className="flex-row items-center flex-1">
                          <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-2">
                            <FontAwesome6 name="user-plus" size={14} color="#10B981" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm text-foreground">{user.user_name}</Text>
                            <Text className="text-xs text-gray-400">ID: {user.user_id}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleAddCollaborator(user.user_id, user.user_name)}
                          className="px-3 py-1 rounded-full bg-indigo-500"
                        >
                          <Text className="text-xs text-white">添加</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* AI 写作助手弹窗 */}
        <Modal visible={aiAssistantVisible} transparent animationType="slide" onRequestClose={handleCloseAiAssistant}>
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl w-full" style={{ maxHeight: '88%' }}>
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-2">
                    <FontAwesome6 name="wand-magic-sparkles" size={14} color="#8B5CF6" />
                  </View>
                  <Text className="text-lg font-bold text-foreground">AI 写作助手</Text>
                </View>
                <TouchableOpacity onPress={handleCloseAiAssistant} disabled={aiAssistantLoading} className="p-2">
                  <FontAwesome6 name="xmark" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* 提示语 */}
              <View className="px-5 pt-4 pb-2">
                <View className="bg-purple-50 rounded-2xl px-4 py-3">
                  <Text className="text-sm text-purple-700 font-medium">撰写？修改？润色？由你决定</Text>
                  <Text className="text-xs text-purple-500 mt-1">基于当前笔记内容，告诉我你的需求，AI 会流式输出修改后的完整文章</Text>
                </View>
              </View>

              {/* 输入区 + 发送按钮 */}
              <View className="px-5 pt-2 pb-3">
                <View
                  className="bg-gray-100 rounded-2xl px-3 py-2 flex-row items-end"
                  style={{ minHeight: 56 }}
                >
                  <TextInput
                    value={aiInstruction}
                    onChangeText={setAiInstruction}
                    placeholder="例如：把第三段润色得更生动；帮我续写一段结尾…"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    className="flex-1 text-sm text-foreground max-h-32"
                    style={{ outline: 'none', minHeight: 40 }}
                    editable={!aiAssistantLoading}
                  />
                  <TouchableOpacity
                    onPress={handleSendAiInstruction}
                    disabled={aiAssistantLoading || !aiInstruction.trim()}
                    className="ml-2 mb-1 px-3 py-2 rounded-full"
                    style={{
                      backgroundColor: aiAssistantLoading || !aiInstruction.trim() ? '#C4B5FD' : '#8B5CF6',
                    }}
                  >
                    {aiAssistantLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <FontAwesome6 name="paper-plane" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 结果展示区 */}
              <View className="px-5 pb-3 flex-1">
                <View
                  className="bg-white rounded-2xl border border-gray-200 px-4 py-3"
                  style={{ minHeight: 180, maxHeight: 320 }}
                >
                  {aiAssistantLoading && !aiStreamText ? (
                    <View className="flex-1 items-center justify-center">
                      <ActivityIndicator size="small" color="#8B5CF6" />
                      <Text className="text-xs text-gray-400 mt-2">AI 正在思考…</Text>
                    </View>
                  ) : aiStreamText ? (
                    <ScrollView showsVerticalScrollIndicator>
                      <Text className="text-sm text-foreground leading-6" selectable>
                        {aiStreamText}
                      </Text>
                    </ScrollView>
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <FontAwesome6 name="feather-pointed" size={22} color="#D1D5DB" />
                      <Text className="text-xs text-gray-400 mt-2">AI 修改后的内容将显示在这里</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 底部按钮 */}
              <View className="flex-row px-5 pt-2 pb-6 border-t border-gray-100">
                <TouchableOpacity
                  onPress={handleCloseAiAssistant}
                  disabled={aiAssistantLoading}
                  className="flex-1 mr-2 py-3 rounded-full bg-gray-100 items-center"
                >
                  <Text className="text-sm font-medium text-gray-700">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApplyAiResult}
                  disabled={aiAssistantLoading || !aiStreamText.trim()}
                  className="flex-1 ml-2 py-3 rounded-full items-center"
                  style={{
                    backgroundColor: aiAssistantLoading || !aiStreamText.trim() ? '#C4B5FD' : '#8B5CF6',
                  }}
                >
                  <Text className="text-sm font-medium text-white">应用到笔记</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}
