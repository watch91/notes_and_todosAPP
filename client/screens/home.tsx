import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

// 屏蔽关键词
const BLOCK_KEYWORDS = ['更新公告', 'test'];

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Todo {
  id: number;
  title: string;
  is_completed: boolean;
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
  created_at: string;
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

  const fetchData = useCallback(async () => {
    try {
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
      }));

      const todos: HomeItem[] = (todosData.data || []).map((t: Todo) => ({
        type: 'todo' as ItemType,
        id: t.id,
        title: t.title,
        is_completed: t.is_completed,
        created_at: t.created_at,
      }));

      setItems([...notes, ...todos].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleDeleteNote = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/v1/notes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleToggleTodo = async (todo: HomeItem) => {
    try {
      await fetch(`${API_BASE}/api/v1/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !todo.is_completed }),
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/v1/todos/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting todo:', error);
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
          <Text className="text-2xl font-bold text-foreground">我的记录</Text>
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
                      <Text className="text-xs text-muted mt-2 ml-10">{formatDate(item.created_at)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => item.type === 'note' ? handleDeleteNote(item.id) : handleDeleteTodo(item.id)}
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
      </View>
    </Screen>
  );
}
