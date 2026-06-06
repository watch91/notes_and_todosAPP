import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SecretNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface SecretTodo {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

const NOTES_KEY = 'secret_notes';
const TODOS_KEY = 'secret_todos';
const PASSWORD_KEY = 'secret_password';

// 简单的密码编码/解码
const encodePassword = (pwd: string) => Buffer.from(pwd).toString('base64');
const decodePassword = (encoded: string) => Buffer.from(encoded, 'base64').toString();

export default function SecretPage() {
  const router = useSafeRouter();
  const [isLocked, setIsLocked] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notes, setNotes] = useState<SecretNote[]>([]);
  const [todos, setTodos] = useState<SecretTodo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'note' | 'todo'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: 'note' | 'todo'; data?: SecretNote | SecretTodo } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // 检查密码是否已设置
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const storedPwd = await AsyncStorage.getItem(PASSWORD_KEY);
        if (storedPwd) {
          setIsFirstTime(false);
        } else {
          setIsFirstTime(true);
        }
      } catch (error) {
        console.error('Error checking password:', error);
        setIsFirstTime(true);
      }
    };
    checkPassword();
  }, []);

  // 设置密码
  const handleSetPassword = () => {
    if (!password.trim()) {
      Alert.alert('提示', '请输入密码');
      return;
    }
    if (password.length < 4) {
      Alert.alert('提示', '密码至少4位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次密码不一致');
      return;
    }
    const encoded = encodePassword(password);
    AsyncStorage.setItem(PASSWORD_KEY, encoded);
    setIsLocked(false);
    setPassword('');
    setConfirmPassword('');
  };

  // 验证密码并加载数据
  const handleVerifyPassword = () => {
    if (!password.trim()) {
      Alert.alert('提示', '请输入密码');
      return;
    }
    AsyncStorage.getItem(PASSWORD_KEY).then(storedPwd => {
      if (storedPwd && decodePassword(storedPwd) === password) {
        setIsLocked(false);
        setPassword('');
        loadData();
      } else {
        Alert.alert('错误', '密码错误');
      }
    });
  };

  const loadData = useCallback(async () => {
    try {
      const notesStr = await AsyncStorage.getItem(NOTES_KEY);
      const todosStr = await AsyncStorage.getItem(TODOS_KEY);
      if (notesStr) setNotes(JSON.parse(notesStr));
      if (todosStr) setTodos(JSON.parse(todosStr));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const saveData = useCallback(async (notesData: SecretNote[], todosData: SecretTodo[]) => {
    try {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notesData));
      await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(todosData));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAdd = (type: 'note' | 'todo') => {
    setEditingItem({ type });
    setEditTitle('');
    setEditContent('');
    setModalVisible(true);
  };

  const handleEdit = (type: 'note' | 'todo', item: SecretNote | SecretTodo) => {
    setEditingItem({ type, data: item });
    setEditTitle(item.title);
    setEditContent(type === 'note' ? (item as SecretNote).content : '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    if (editingItem?.type === 'note') {
      if (editingItem.data) {
        const updated = notes.map(n =>
          n.id === editingItem.data!.id
            ? { ...n, title: editTitle, content: editContent, updatedAt: new Date().toISOString() }
            : n
        );
        setNotes(updated);
        await saveData(updated, todos);
      } else {
        const newNote: SecretNote = {
          id: Date.now().toString(),
          title: editTitle,
          content: editContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [newNote, ...notes];
        setNotes(updated);
        await saveData(updated, todos);
      }
    } else {
      if (editingItem?.data) {
        const updated = todos.map(t =>
          t.id === editingItem.data!.id ? { ...t, title: editTitle } : t
        );
        setTodos(updated);
        await saveData(notes, updated);
      } else {
        const newTodo: SecretTodo = {
          id: Date.now().toString(),
          title: editTitle,
          isCompleted: false,
          createdAt: new Date().toISOString(),
        };
        const updated = [newTodo, ...todos];
        setTodos(updated);
        await saveData(notes, updated);
      }
    }

    setModalVisible(false);
  };

  const handleDelete = async (type: 'note' | 'todo', id: string) => {
    Alert.alert('确认删除', '确定要删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          if (type === 'note') {
            const updated = notes.filter(n => n.id !== id);
            setNotes(updated);
            await saveData(updated, todos);
          } else {
            const updated = todos.filter(t => t.id !== id);
            setTodos(updated);
            await saveData(notes, updated);
          }
        },
      },
    ]);
  };

  const handleToggleTodo = async (id: string) => {
    const updated = todos.map(t =>
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    );
    setTodos(updated);
    await saveData(notes, updated);
  };

  // 密码设置/验证界面
  if (isLocked) {
    return (
      <Screen>
        <View className="flex-1 bg-background items-center justify-center px-8">
          <FontAwesome6 name="lock" size={64} color="#4F46E5" />
          <Text className="text-2xl font-bold text-foreground mt-6">
            {isFirstTime ? '设置密码' : '请输入密码'}
          </Text>
          <Text className="text-muted mt-2 text-center">
            {isFirstTime ? '设置密码保护您的小秘密' : '输入密码解锁小秘密'}
          </Text>

          <View className="w-full mt-8">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="输入密码"
              secureTextEntry
              className="bg-white rounded-xl px-4 py-4 text-foreground mb-4"
              placeholderTextColor="#9CA3AF"
            />
            
            {isFirstTime && (
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="确认密码"
                secureTextEntry
                className="bg-white rounded-xl px-4 py-4 text-foreground mb-6"
                placeholderTextColor="#9CA3AF"
              />
            )}

            <TouchableOpacity
              onPress={isFirstTime ? handleSetPassword : handleVerifyPassword}
              className="bg-accent rounded-full py-4"
            >
              <Text className="text-white text-center font-bold text-lg">
                {isFirstTime ? '确认设置' : '解锁'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    );
  }

  const filteredNotes = filter === 'todo' ? [] : notes;
  const filteredTodos = filter === 'note' ? [] : todos;
  const combined = [...filteredNotes.map(n => ({ ...n, type: 'note' as const })), ...filteredTodos.map(t => ({ ...t, type: 'todo' as const }))];

  return (
    <Screen>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text className="text-2xl font-bold text-foreground">小秘密</Text>
          <Text className="text-sm text-muted mt-1">本地保存，安全私密</Text>
        </View>

        {/* Filter Tabs */}
        <View className="px-5 mb-4">
          <View className="flex-row bg-white rounded-full p-1" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            {[
              { key: 'all', label: '全部' },
              { key: 'note', label: '笔记' },
              { key: 'todo', label: '待办' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setFilter(tab.key as any)}
                className={`flex-1 py-2 rounded-full ${filter === tab.key ? 'bg-accent' : ''}`}
              >
                <Text className={`text-center text-sm font-medium ${filter === tab.key ? 'text-white' : 'text-foreground'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {combined.length === 0 ? (
            <View className="py-20 items-center">
              <FontAwesome6 name="lock" size={48} color="#D1D5DB" />
              <Text className="text-muted mt-4">暂无内容</Text>
              <Text className="text-muted text-sm">点击下方按钮创建</Text>
            </View>
          ) : (
            combined.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => item.type === 'note' && handleEdit('note', item as SecretNote)}
                className="bg-white rounded-2xl p-4 mb-3"
                style={{ shadowColor: '#4F46E5', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    {item.type === 'todo' && (
                      <TouchableOpacity onPress={() => handleToggleTodo(item.id)} className="mr-3">
                        <FontAwesome6
                          name={item.isCompleted ? 'check-circle' : 'circle'}
                          size={22}
                          color={item.isCompleted ? '#10B981' : '#D1D5DB'}
                        />
                      </TouchableOpacity>
                    )}
                    <View className="flex-1">
                      <Text
                        className={`text-base font-medium ${item.type === 'todo' && item.isCompleted ? 'text-muted line-through' : 'text-foreground'}`}
                        numberOfLines={1}
                      >
                        {item.type === 'note' ? (item as SecretNote).title : item.title}
                      </Text>
                      {item.type === 'note' && (
                        <Text className="text-sm text-muted mt-1" numberOfLines={2}>
                          {(item as SecretNote).content}
                        </Text>
                      )}
                      <Text className="text-xs text-muted mt-2">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.type, item.id)} className="p-2">
                    <FontAwesome6 name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View className="h-28" />
        </ScrollView>

        {/* FAB */}
        <View className="absolute bottom-24 right-5">
          <TouchableOpacity
            onPress={() => handleAdd(filter === 'all' ? 'note' : filter as 'note' | 'todo')}
            className="w-14 h-14 rounded-full bg-accent items-center justify-center"
            style={{ shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <FontAwesome6 name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Add/Edit Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-5 max-h-[80%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-foreground">
                  {editingItem?.data ? '编辑' : '新建'}{editingItem?.type === 'note' ? '笔记' : '待办'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="输入标题..."
                className="bg-gray-50 rounded-xl px-4 py-3 text-foreground mb-3"
                placeholderTextColor="#9CA3AF"
              />

              {editingItem?.type === 'note' && (
                <TextInput
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="输入内容..."
                  className="bg-gray-50 rounded-xl px-4 py-3 text-foreground mb-3 min-h-[150px]"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                />
              )}

              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="flex-1 py-3 rounded-full border border-gray-200"
                >
                  <Text className="text-center text-foreground">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!editTitle.trim()}
                  className="flex-1 py-3 rounded-full bg-accent disabled:opacity-50"
                >
                  <Text className="text-center text-white font-medium">保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
