import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, Modal, Linking, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

// 屏蔽关键词
const BLOCK_KEYWORDS = ['更新公告', 'test'];

// 标签对应关系
const LABELS: Record<number, string> = {
  1: '生活', 2: '工作', 3: '学习', 4: '娱乐', 5: '旅游',
  6: '美食', 7: '运动', 8: '健康', 9: '家庭', 10: '社交',
  11: '科技', 12: '艺术', 13: '音乐', 14: '电影', 15: '阅读',
  16: '游戏', 17: '购物', 18: '宠物', 19: '汽车', 20: '房产',
  21: '投资', 22: '理财', 23: '教育', 24: '育儿', 25: '情感',
  26: '心理', 27: '哲学', 28: '宗教', 29: '历史', 30: '文化',
  31: '自然', 32: '社会', 33: '政治', 34: '经济', 35: '法律',
  36: '军事', 37: '其他',
};

// 标签颜色
const LABEL_COLORS: Record<number, string> = {
  1: '#FF6B6B', 2: '#4ECDC4', 3: '#45B7D1', 4: '#96CEB4', 5: '#FFEAA7',
  6: '#DDA0DD', 7: '#98D8C8', 8: '#F7DC6F', 9: '#BB8FCE', 10: '#85C1E2',
  11: '#F8B739', 12: '#52B3D9', 13: '#E08283', 14: '#86C232', 15: '#6A89CC',
  16: '#B33771', 17: '#22A6B3', 18: '#F97F51', 19: '#1B9CFC', 20: '#58B19F',
  21: '#3D3D3D', 22: '#6AB04C', 23: '#EAB543', 24: '#FA983A', 25: '#EB2F06',
  26: '#182C61', 27: '#C4E538', 28: '#A3CB38', 29: '#FDA7DF', 30: '#D980FA',
  31: '#0652DD', 32: '#12CBC4', 33: '#ED4C67', 34: '#B53471', 35: '#EE5A24',
  36: '#009432', 37: '#6F1E51',
};

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  label_1?: number | null;
  label_2?: number | null;
  label_3?: number | null;
}

interface Todo {
  id: number;
  title: string;
  is_completed: boolean;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

type ItemType = 'note' | 'todo';
type FilterType = 'all' | 'note' | 'todo';

interface HomeItem {
  type: ItemType;
  id: number;
  title: string;
  subtitle?: string;
  is_completed?: boolean;
  due_date?: string;
  created_at: string;
  labels?: (number | null)[];
}

export default function HomePage() {
  const router = useSafeRouter();
  const [items, setItems] = useState<HomeItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HomeItem[] | null>(null);
  const [屏蔽过滤开关, set屏蔽过滤开关] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<HomeItem | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<'first' | 'second' | 'input' | null>(null);
  const [deleteInputTitle, setDeleteInputTitle] = useState('');

  const checkAgreement = async () => {
    try {
      const agreed = await AsyncStorage.getItem('agreement_agreed');
      if (!agreed) {
        setShowAgreement(true);
      }
    } catch (e) {
      console.error('Failed to check agreement:', e);
    }
  };

  const handleAgree = async () => {
    try {
      await AsyncStorage.setItem('agreement_agreed', 'true');
      setShowAgreement(false);
    } catch (e) {
      console.error('Failed to save agreement:', e);
    }
  };

  const handleDisagree = () => {
    // 不同意则退出应用或限制使用
    Linking.openURL('https://www.baidu.com');
  };

  // 检查是否需要显示协议
  useEffect(() => {
    checkAgreement();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      logger.info('首页', '开始获取笔记和待办数据');
      const [notesRes, todosRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/notes`),
        fetch(`${API_BASE}/api/v1/todos`),
      ]);
      const notesData = await notesRes.json();
      const todosData = await todosRes.json();

      const notes: HomeItem[] = (notesData.data || []).map((n: Note) => ({
        type: 'note' as ItemType,
        id: n.id,
        title: n.title,
        subtitle: n.content?.substring(0, 50) || '无内容',
        created_at: n.created_at,
        labels: [n.label_1 ?? null, n.label_2 ?? null, n.label_3 ?? null].filter(l => l !== null),
      }));

      const todos: HomeItem[] = (todosData.data || []).map((t: Todo) => ({
        type: 'todo' as ItemType,
        id: t.id,
        title: t.title,
        is_completed: t.is_completed,
        due_date: t.due_date,
        created_at: t.created_at,
      }));

      setItems([...notes, ...todos].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      logger.info('首页', `数据加载完成，共${notes.length}条笔记，${todos.length}条待办`);
    } catch (error) {
      logger.error('首页', error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDeleteNote = (item: HomeItem) => {
    const contentLength = item.subtitle?.length || 0;
    
    setDeleteConfirmItem(item);
    
    // 内容 <= 10字：只需一次确认
    if (contentLength <= 10) {
      setDeleteConfirmStep('first');
      return;
    }
    
    // 内容 > 10字且 <= 50字：需要两次确认
    if (contentLength <= 50) {
      setDeleteConfirmStep('first');
      return;
    }
    
    // 内容 > 50字：需要两次确认 + 输入标题
    setDeleteConfirmStep('first');
  };

  const handleDeleteConfirmFirst = () => {
    if (!deleteConfirmItem) return;
    const contentLength = deleteConfirmItem.subtitle?.length || 0;
    
    // 内容 <= 10字，第一次确认后直接删除
    if (contentLength <= 10) {
      executeDelete();
      return;
    }
    
    // 内容 > 10字，需要第二次确认
    setDeleteConfirmStep('second');
  };

  const handleDeleteConfirmSecond = () => {
    if (!deleteConfirmItem) return;
    const contentLength = deleteConfirmItem.subtitle?.length || 0;
    
    // 内容 <= 50字，第二次确认后直接删除
    if (contentLength <= 50) {
      executeDelete();
      return;
    }
    
    // 内容 > 50字，需要输入标题确认
    setDeleteConfirmStep('input');
  };

  const handleDeleteConfirmInput = () => {
    if (!deleteConfirmItem) return;
    if (deleteInputTitle === deleteConfirmItem.title) {
      executeDelete();
    } else {
      Alert.alert('错误', '标题不匹配，请重新输入');
      setDeleteInputTitle('');
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      logger.info('首页', `删除笔记: ${deleteConfirmItem.title}`);
      await fetch(`${API_BASE}/api/v1/notes/${deleteConfirmItem.id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      logger.error('首页', error instanceof Error ? error : new Error(String(error)));
    } finally {
      resetDeleteConfirm();
    }
  };

  const resetDeleteConfirm = () => {
    setDeleteConfirmItem(null);
    setDeleteConfirmStep(null);
    setDeleteInputTitle('');
  };

  const handleToggleTodo = async (todo: HomeItem) => {
    try {
      logger.info('首页', `${todo.is_completed ? '取消完成' : '完成'}待办: ${todo.title}`);
      await fetch(`${API_BASE}/api/v1/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !todo.is_completed }),
      });
      fetchData();
    } catch (error) {
      logger.error('首页', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      logger.info('首页', `删除待办: ID=${id}`);
      await fetch(`${API_BASE}/api/v1/todos/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      logger.error('首页', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/notes/search?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data.map((n: Note) => ({
          type: 'note' as ItemType,
          id: n.id,
          title: n.title,
          subtitle: n.content?.substring(0, 50) || '无内容',
          created_at: n.created_at,
          labels: [n.label_1 ?? null, n.label_2 ?? null, n.label_3 ?? null].filter(l => l !== null),
        })));
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const filteredItems = items.filter(item => {
    if (屏蔽过滤开关 && item.type === 'note' && BLOCK_KEYWORDS.some(kw => item.title.includes(kw))) {
      return false;
    }
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const displayItems = searchResults !== null ? searchResults.filter(item => {
    if (屏蔽过滤开关 && item.type === 'note' && BLOCK_KEYWORDS.some(kw => item.title.includes(kw))) {
      return false;
    }
    if (filter === 'all') return true;
    return item.type === filter;
  }) : filteredItems;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Screen>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text className="text-2xl font-bold text-foreground">笔记广场</Text>
          <Text className="text-sm text-muted mt-1">记录生活点滴</Text>
        </View>

        {/* 屏蔽开关 */}
        <View className="px-5 pb-3 flex-row items-center justify-end">
          <Text className="text-xs text-muted mr-2">屏蔽更新公告与测试笔记</Text>
          <TouchableOpacity
            className={`w-10 h-6 rounded-full p-0.5 ${屏蔽过滤开关 ? 'bg-indigo-500' : 'bg-gray-300'}`}
            onPress={() => set屏蔽过滤开关(!屏蔽过滤开关)}
          >
            <View className={`w-5 h-5 rounded-full bg-white ${屏蔽过滤开关 ? 'ml-4' : 'ml-0'}`} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-5 pb-3">
          <View className="bg-white rounded-xl flex-row items-center px-3 py-2">
            <FontAwesome6 name="magnifying-glass" size={16} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="搜索笔记标题..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-foreground"
              style={{ outline: 'none' }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <FontAwesome6 name="circle-xmark" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-5 pb-3">
          <View className="flex-row gap-2">
            {[
              { key: 'all', label: '全部' },
              { key: 'note', label: '笔记' },
              { key: 'todo', label: '待办' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setFilter(tab.key as FilterType)}
                className={`px-4 py-2 rounded-full ${filter === tab.key ? 'bg-accent' : 'bg-surface'}`}
              >
                <Text className={`text-sm font-medium ${filter === tab.key ? 'text-white' : 'text-foreground'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content List */}
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {displayItems.length === 0 ? (
            <View className="items-center justify-center py-20">
              <FontAwesome6 name="clipboard" size={48} color="#d1d5db" />
              <Text className="text-muted mt-4">{searchQuery ? '未找到相关笔记' : '暂无内容'}</Text>
              <Text className="text-sm text-muted">{searchQuery ? '尝试其他关键词' : '点击下方按钮添加笔记或待办'}</Text>
            </View>
          ) : (
            <View className="pb-24 gap-3">
              {displayItems.map(item => (
                <TouchableOpacity
                  key={`${item.type}-${item.id}`}
                  onPress={() => {
                    if (item.type === 'note') {
                      router.push('/note-edit', { id: item.id, title: item.title, content: items.find(i => i.id === item.id && i.type === 'note')?.subtitle || '' });
                    } else if (item.type === 'todo') {
                      router.push('/todo-edit', { id: item.id, title: item.title });
                    }
                  }}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                  style={{
                    shadowColor: '#4F46E5',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        {item.type === 'note' ? (
                          <View className="w-8 h-8 rounded-lg bg-indigo-100 items-center justify-center">
                            <FontAwesome6 name="note-sticky" size={14} color="#4F46E5" />
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleToggleTodo(item)}
                            className="w-8 h-8 rounded-lg bg-emerald-100 items-center justify-center"
                          >
                            <FontAwesome6
                              name={item.is_completed ? "check-circle" : "circle"}
                              size={16}
                              color={item.is_completed ? "#10B981" : "#9CA3AF"}
                            />
                          </TouchableOpacity>
                        )}
                        <Text
                          className={`text-base font-medium flex-1 ${item.type === 'todo' && item.is_completed ? 'line-through text-muted' : 'text-foreground'}`}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>
                      {item.type === 'note' && item.subtitle && (
                        <Text className="text-sm text-muted mt-2 ml-10" numberOfLines={2}>
                          {item.subtitle}
                        </Text>
                      )}
                      {item.type === 'note' && item.labels && item.labels.length > 0 && (
                        <View className="flex-row flex-wrap mt-2 ml-10">
                          {item.labels.map((labelId, index) => (
                            <View
                              key={index}
                              className="flex-row items-center mr-1.5 mb-1 px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: LABEL_COLORS[labelId as number] + '20' }}
                            >
                              <View className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: LABEL_COLORS[labelId as number] }} />
                              <Text className="text-[10px]" style={{ color: LABEL_COLORS[labelId as number] }}>
                                {LABELS[labelId as number]}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {item.type === 'todo' && item.due_date && (
                        <View className="flex-row items-center mt-2 ml-10">
                          <FontAwesome6 name="clock" size={12} color="#3B82F6" />
                          <Text className="text-xs text-blue-500 ml-1">
                            {new Date(item.due_date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      )}
                      <Text className="text-xs text-muted mt-2 ml-10">{formatDate(item.created_at)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => item.type === 'note' ? handleDeleteNote(item) : handleDeleteTodo(item.id)}
                      className="p-2 ml-2"
                    >
                      <FontAwesome6 name="trash" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <View className="absolute bottom-8 right-5">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="w-14 h-14 rounded-full bg-accent items-center justify-center shadow-lg"
            style={{
              shadowColor: '#4F46E5',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <FontAwesome6 name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Create Modal */}
        {modalVisible && (
          <TouchableOpacity
            className="absolute inset-0 bg-black/40 items-center justify-end"
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          >
            <TouchableOpacity activeOpacity={1} onPress={undefined} className="w-full bg-white rounded-t-3xl p-6 pb-10">
              <View className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              <Text className="text-lg font-bold text-foreground mb-4">新建内容</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    router.push('/note-edit', {});
                  }}
                  className="flex-1 bg-indigo-50 rounded-2xl p-5 items-center"
                >
                  <View className="w-12 h-12 rounded-xl bg-indigo-500 items-center justify-center mb-3">
                    <FontAwesome6 name="note-sticky" size={20} color="white" />
                  </View>
                  <Text className="font-medium text-foreground">笔记</Text>
                  <Text className="text-xs text-muted mt-1">记录想法</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    router.push('/todo-edit', {});
                  }}
                  className="flex-1 bg-emerald-50 rounded-2xl p-5 items-center"
                >
                  <View className="w-12 h-12 rounded-xl bg-emerald-500 items-center justify-center mb-3">
                    <FontAwesome6 name="check" size={20} color="white" />
                  </View>
                  <Text className="font-medium text-foreground">待办</Text>
                  <Text className="text-xs text-muted mt-1">规划任务</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Delete Confirm Modal */}
        <Modal visible={deleteConfirmStep !== null} transparent animationType="fade">
          <View className="flex-1 bg-black/60 items-center justify-center p-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              {deleteConfirmStep === 'first' && (
                <>
                  <Text className="text-lg font-bold text-center text-foreground mb-4">
                    确认删除
                  </Text>
                  <Text className="text-center text-muted mb-6">确认要删除吗？</Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 bg-gray-200 rounded-xl py-3"
                      onPress={resetDeleteConfirm}
                    >
                      <Text className="text-center text-gray-600 font-medium">取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-red-500 rounded-xl py-3"
                      onPress={handleDeleteConfirmFirst}
                    >
                      <Text className="text-center text-white font-medium">确认</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {deleteConfirmStep === 'second' && (
                <>
                  <Text className="text-lg font-bold text-center text-foreground mb-4">
                    再次确认
                  </Text>
                  <Text className="text-center text-muted mb-6">确认要删除吗？</Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 bg-gray-200 rounded-xl py-3"
                      onPress={resetDeleteConfirm}
                    >
                      <Text className="text-center text-gray-600 font-medium">取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-red-500 rounded-xl py-3"
                      onPress={handleDeleteConfirmSecond}
                    >
                      <Text className="text-center text-white font-medium">确认</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {deleteConfirmStep === 'input' && deleteConfirmItem && (
                <>
                  <Text className="text-lg font-bold text-center text-foreground mb-4">
                    输入标题确认
                  </Text>
                  <Text className="text-center text-muted mb-4">
                    请输入笔记标题以确认删除
                  </Text>
                  <View className="bg-gray-100 rounded-xl px-4 py-3 mb-2">
                    <Text className="text-sm text-muted">正确标题：</Text>
                    <Text className="font-medium text-foreground">{deleteConfirmItem.title}</Text>
                  </View>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-foreground mb-6"
                    placeholder="请输入笔记标题"
                    placeholderTextColor="#9CA3AF"
                    value={deleteInputTitle}
                    onChangeText={setDeleteInputTitle}
                    style={{ outline: 'none' }}
                  />
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 bg-gray-200 rounded-xl py-3"
                      onPress={resetDeleteConfirm}
                    >
                      <Text className="text-center text-gray-600 font-medium">取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-red-500 rounded-xl py-3"
                      onPress={handleDeleteConfirmInput}
                    >
                      <Text className="text-center text-white font-medium">确认删除</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Agreement Modal */}
        <Modal visible={showAgreement} transparent animationType="fade">
          <View className="flex-1 bg-black/60 items-center justify-center p-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-md">
              <Text className="text-xl font-bold text-center text-foreground mb-4">
                用户使用协议
              </Text>
              <ScrollView className="max-h-80">
                <Text className="text-sm text-muted leading-6">
                  欢迎使用本笔记待办APP！在使用本应用全部功能前，请您认真阅读本《用户使用协议》。您的注册、登录、浏览、使用等任何操作，即表示您已充分阅读、理解并同意接受本协议全部条款。{'\n\n'}
                  <Text className="font-bold text-foreground">一、服务说明{'\n'}</Text>
                  本应用为用户提供笔记记录、待办事项管理等服务。本服务仅供个人非商业用途使用。{'\n\n'}
                  <Text className="font-bold text-foreground">二、用户账号与使用规范{'\n'}</Text>
                  用户需妥善保管账号安全，不得利用本应用发布违法违规内容。{'\n\n'}
                  <Text className="font-bold text-foreground">三、用户内容与知识产权{'\n'}</Text>
                  用户创建的内容知识产权归用户本人所有。本应用的界面、代码等知识产权归我方所有。{'\n\n'}
                  <Text className="font-bold text-foreground">四、权限与隐私保护{'\n'}</Text>
                  我方严格保护用户个人信息与笔记隐私。{'\n\n'}
                  <Text className="font-bold text-foreground">五、数据存储与风险{'\n'}</Text>
                  电子数据存在固有风险，建议用户定期备份重要数据。{'\n\n'}
                  完整协议请在「我的-设置-用户使用协议」中查看。
                </Text>
              </ScrollView>
              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-3"
                  onPress={handleDisagree}
                >
                  <Text className="text-center text-gray-600 font-medium">不同意</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-indigo-500 rounded-xl py-3"
                  onPress={handleAgree}
                >
                  <Text className="text-center text-white font-medium">同意并继续</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
