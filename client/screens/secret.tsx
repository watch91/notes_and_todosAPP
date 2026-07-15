import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, RefreshControl, SafeAreaView, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/utils/logger';

interface SecretNote {
  id: string;
  title: string;
  content: string;
  images: string[];
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
// Base64 编码/解码（兼容 React Native）
const encodePassword = (pwd: string) => {
  if (typeof btoa !== 'undefined') return btoa(pwd);
  return Buffer.from(pwd).toString('base64');
};
const decodePassword = (encoded: string) => {
  if (typeof atob !== 'undefined') return atob(encoded);
  return Buffer.from(encoded, 'base64').toString();
};

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
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [importPasswordModalVisible, setImportPasswordModalVisible] = useState(false);
  const [importPassword, setImportPassword] = useState('');

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
    setEditImages([]);
    setModalVisible(true);
  };

  const handleEdit = (type: 'note' | 'todo', item: SecretNote | SecretTodo) => {
    setEditingItem({ type, data: item });
    setEditTitle(item.title);
    setEditContent(type === 'note' ? (item as SecretNote).content : '');
    setEditImages(type === 'note' ? (item as SecretNote).images || [] : []);
    // 笔记默认只读，待办直接编辑
    setIsReadOnly(type === 'note');
    setModalVisible(true);
  };

  const handleStartEdit = () => {
    setIsReadOnly(false);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    if (editingItem?.type === 'note') {
      if (editingItem.data) {
        logger.info('小秘密', `修改秘密笔记: ${editTitle}`);
        const updated = notes.map(n =>
          n.id === editingItem.data!.id
            ? { ...n, title: editTitle, content: editContent, images: editImages, updatedAt: new Date().toISOString() }
            : n
        );
        setNotes(updated);
        await saveData(updated, todos);
      } else {
        logger.info('小秘密', `创建秘密笔记: ${editTitle}`);
        const newNote: SecretNote = {
          id: Date.now().toString(),
          title: editTitle,
          content: editContent,
          images: editImages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [newNote, ...notes];
        setNotes(updated);
        await saveData(updated, todos);
      }
    } else {
      if (editingItem?.data) {
        logger.info('小秘密', `修改秘密待办: ${editTitle}`);
        const updated = todos.map(t =>
          t.id === editingItem.data!.id ? { ...t, title: editTitle } : t
        );
        setTodos(updated);
        await saveData(notes, updated);
      } else {
        logger.info('小秘密', `创建秘密待办: ${editTitle}`);
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

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('提示', '需要相册权限才能添加图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEditImages([...editImages, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...editImages];
    newImages.splice(index, 1);
    setEditImages(newImages);
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

  // 获取备份目录路径
  const getBackupDirectory = () => {
    if (Platform.OS === 'android') {
      // Android: 使用外部存储的 Download 目录
      return 'file:///storage/emulated/0/Download/todosandnotessave/';
    } else if (Platform.OS === 'ios') {
      // iOS: 使用文档目录
      return `${(FileSystem as any).documentDirectory}todosandnotessave/`;
    }
    return null;
  };

  // 导出备份
  const handleExportBackup = async () => {
    try {
      logger.info('导出备份', `开始导出，当前有 ${notes.length} 条笔记，${todos.length} 条待办`);
      const backupData = {
        version: 1,
        exportTime: new Date().toISOString(),
        notes,
        todos,
      };
      const jsonContent = JSON.stringify(backupData, null, 2);
      const fileName = `secret_backup_${Date.now()}.json`;
      logger.info('导出备份', `生成文件名: ${fileName}, 大小: ${jsonContent.length} 字节`);

      if (Platform.OS === 'web') {
        // Web 端：使用浏览器下载
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logger.info('导出备份', `Web端导出成功: ${fileName}`);
        Alert.alert('成功', '备份文件已下载');
      } else {
        // 移动端：直接保存到 Download/todosandnotessave 目录
        const backupDir = getBackupDirectory();
        if (!backupDir) {
          logger.error('导出备份', new Error('不支持的平台'));
          Alert.alert('错误', '不支持的平台');
          return;
        }
        logger.info('导出备份', `目标目录: ${backupDir}`);

        // 检查目录是否存在，不存在则创建
        const dirInfo = await (FileSystem as any).getInfoAsync(backupDir);
        if (!dirInfo.exists) {
          logger.info('导出备份', `目录不存在，正在创建: ${backupDir}`);
          await (FileSystem as any).makeDirectoryAsync(backupDir, { intermediates: true });
          logger.info('导出备份', '目录创建成功');
        } else {
          logger.info('导出备份', '目录已存在');
        }

        // 写入文件
        const fileUri = `${backupDir}${fileName}`;
        logger.info('导出备份', `正在写入文件: ${fileUri}`);
        await (FileSystem as any).writeAsStringAsync(fileUri, jsonContent, {
          encoding: (FileSystem as any).EncodingType.UTF8,
        });
        
        logger.info('导出备份', `导出成功: ${fileUri}, 包含 ${notes.length} 条笔记, ${todos.length} 条待办`);
        Alert.alert('成功', `备份文件已保存到:\nDownload/todosandnotessave/${fileName}`);
      }
    } catch (error) {
      logger.error('导出备份', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('错误', `导出备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 载入备份
  const handleImportBackup = () => {
    Alert.alert(
      '警告',
      '载入备份会删除所有现有笔记，是否确认载入？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => showPasswordVerifyForImport(),
        },
      ]
    );
  };

  // 显示密码验证弹窗
  const showPasswordVerifyForImport = () => {
    setImportPassword('');
    setImportPasswordModalVisible(true);
  };

  // 确认载入备份（密码验证后）
  const handleConfirmImport = async () => {
    const storedPwd = await AsyncStorage.getItem(PASSWORD_KEY);
    if (storedPwd && decodePassword(storedPwd) === importPassword) {
      setImportPasswordModalVisible(false);
      setImportPassword('');
      // 密码正确，开始载入备份
      await performImportBackup();
    } else {
      Alert.alert('错误', '密码错误');
    }
  };

  // 执行载入备份
  const performImportBackup = async () => {
    try {
      logger.info('载入备份', '开始载入备份');
      
      if (Platform.OS === 'web') {
        // Web 端：使用文件选择器
        logger.info('载入备份', 'Web端：打开文件选择器');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            logger.error('载入备份', new Error('用户未选择文件'));
            Alert.alert('错误', '未选择文件');
            return;
          }
          logger.info('载入备份', `用户选择文件: ${file.name}, 大小: ${file.size} 字节`);
          const text = await file.text();
          logger.info('载入备份', `文件内容读取成功, 长度: ${text.length} 字符`);
          await loadBackupData(text);
        };
        input.click();
      } else {
        // 移动端：从 Download/todosandnotessave 目录查找最新的备份文件
        const backupDir = getBackupDirectory();
        if (!backupDir) {
          logger.error('载入备份', new Error('不支持的平台'));
          Alert.alert('错误', '不支持的平台');
          return;
        }
        logger.info('载入备份', `备份目录: ${backupDir}`);

        // 检查目录是否存在
        const dirInfo = await (FileSystem as any).getInfoAsync(backupDir);
        if (!dirInfo.exists) {
          Alert.alert('载入失败', '找不到指定备份文件！');
          logger.error('载入备份', new Error(`备份目录不存在: ${backupDir}`));
          return;
        }
        logger.info('载入备份', '备份目录存在');

        // 读取目录中的文件
        let files: string[] = [];
        try {
          files = await (FileSystem as any).readDirectoryAsync(backupDir);
          logger.info('载入备份', `目录中共有 ${files.length} 个文件`);
        } catch (readError) {
          Alert.alert('载入失败', '找不到指定备份文件！');
          logger.error('载入备份', new Error(`读取目录失败: ${readError}`));
          return;
        }

        // 过滤备份文件
        const backupFiles = files
          .filter((f: string) => f.startsWith('secret_backup_') && f.endsWith('.json'))
          .sort()
          .reverse();

        logger.info('载入备份', `找到 ${backupFiles.length} 个备份文件: ${backupFiles.join(', ') || '无'}`);

        if (backupFiles.length === 0) {
          Alert.alert('载入失败', '找不到指定备份文件！');
          logger.error('载入备份', new Error(`目录中没有备份文件: ${backupDir}`));
          return;
        }

        // 读取最新的备份文件
        const latestFile = backupFiles[0];
        const fileUri = `${backupDir}${latestFile}`;
        logger.info('载入备份', `选择最新备份文件: ${latestFile}`);
        
        // 检查文件是否存在
        const fileInfo = await (FileSystem as any).getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          Alert.alert('载入失败', '找不到指定备份文件！');
          logger.error('载入备份', new Error(`备份文件不存在: ${fileUri}`));
          return;
        }
        logger.info('载入备份', `文件大小: ${fileInfo.size} 字节`);

        const content = await (FileSystem as any).readAsStringAsync(fileUri);
        if (!content || content.trim() === '') {
          Alert.alert('载入失败', '备份文件内容为空！');
          logger.error('载入备份', new Error(`备份文件内容为空: ${fileUri}`));
          return;
        }
        logger.info('载入备份', `文件内容读取成功, 长度: ${content.length} 字符`);

        await loadBackupData(content);
      }
    } catch (error) {
      logger.error('载入备份', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('载入失败', '找不到指定备份文件！');
    }
  };

  // 加载备份数据
  const loadBackupData = async (jsonContent: string) => {
    try {
      logger.info('载入备份', '正在解析备份数据...');
      const backupData = JSON.parse(jsonContent);
      if (!backupData.notes || !backupData.todos) {
        logger.error('载入备份', new Error('备份文件格式不正确，缺少 notes 或 todos 字段'));
        Alert.alert('错误', '备份文件格式不正确');
        return;
      }
      logger.info('载入备份', `解析成功: 备份包含 ${backupData.notes.length} 条笔记, ${backupData.todos.length} 条待办`);

      // 删除现有数据并载入备份
      logger.info('载入备份', '正在清除现有数据并写入备份...');
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(backupData.notes));
      await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(backupData.todos));
      setNotes(backupData.notes);
      setTodos(backupData.todos);
      
      logger.info('载入备份', `载入成功: ${backupData.notes.length} 条笔记, ${backupData.todos.length} 条待办`);
      Alert.alert('成功', '备份载入成功');
      setImportPasswordModalVisible(false);
    } catch (error) {
      logger.error('载入备份', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('错误', '解析备份文件失败');
    }
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
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-foreground">小秘密</Text>
              <Text className="text-sm text-muted mt-1">本地保存，安全私密</Text>
            </View>
          </View>
          <View className="flex-row mt-3">
            <TouchableOpacity
              onPress={handleExportBackup}
              className="flex-row items-center bg-white px-4 py-2 rounded-full mr-3"
              style={{ shadowColor: '#4F46E5', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
            >
              <FontAwesome6 name="file-export" size={14} color="#4F46E5" />
              <Text className="text-sm text-accent ml-2 font-medium">导出备份</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleImportBackup}
              className="flex-row items-center bg-white px-4 py-2 rounded-full"
              style={{ shadowColor: '#4F46E5', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
            >
              <FontAwesome6 name="file-import" size={14} color="#4F46E5" />
              <Text className="text-sm text-accent ml-2 font-medium">载入备份</Text>
            </TouchableOpacity>
          </View>
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

        {/* Add/Edit Modal - 全屏 */}
        <Modal visible={modalVisible} animationType="slide">
          <KeyboardAvoidingView
            className="flex-1 bg-white"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {/* Header */}
            <SafeAreaView className="bg-white">
              <View className="flex-row justify-between items-center px-5 pt-6 pb-4 border-b border-gray-100">
                {isReadOnly && editingItem?.type === 'note' ? (
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text className="text-accent text-base">返回</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => { setModalVisible(false); setIsReadOnly(false); }}>
                    <Text className="text-accent text-base">取消</Text>
                  </TouchableOpacity>
                )}
                <Text className="text-lg font-bold text-foreground">
                  {editingItem?.data ? '编辑' : '新建'}{editingItem?.type === 'note' ? '笔记' : '待办'}
                </Text>
                {isReadOnly && editingItem?.type === 'note' ? (
                  <TouchableOpacity onPress={handleStartEdit}>
                    <Text className="text-accent text-base font-medium">编辑</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleSave} disabled={!editTitle.trim()}>
                    <Text className={`text-base font-medium ${editTitle.trim() ? 'text-accent' : 'text-gray-300'}`}>保存</Text>
                  </TouchableOpacity>
                )}
              </View>
            </SafeAreaView>

            {/* Content */}
            <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
              {!isReadOnly && (
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="输入标题..."
                  className="bg-gray-50 rounded-xl px-4 py-3 text-foreground text-lg mb-3"
                  placeholderTextColor="#9CA3AF"
                />
              )}

              {editingItem?.type === 'note' && (
                isReadOnly ? (
                  <View className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                    <Text className="text-lg font-medium text-foreground mb-4">{editTitle}</Text>
                    <Text className="text-foreground leading-relaxed">{editContent || '暂无内容'}</Text>
                    {editImages.length > 0 && (
                      <View className="flex-row flex-wrap mt-4">
                        {editImages.map((uri, index) => (
                          <Image key={index} source={{ uri }} className="w-20 h-20 rounded-lg mr-2 mb-2" />
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    <TextInput
                      value={editContent}
                      onChangeText={setEditContent}
                      placeholder="输入内容..."
                      className="bg-gray-50 rounded-xl px-4 py-3 text-foreground min-h-[100px]"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                    />
                    {editImages.length > 0 && (
                      <View className="flex-row flex-wrap mt-3">
                        {editImages.map((uri, index) => (
                          <View key={index} className="relative mr-2 mb-2">
                            <Image source={{ uri }} className="w-20 h-20 rounded-lg" />
                            <TouchableOpacity
                              onPress={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                            >
                              <FontAwesome6 name="xmark" size={12} color="white" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                    <TouchableOpacity onPress={handleAddImage} className="mt-3">
                      <View className="bg-gray-100 rounded-xl px-4 py-3 items-center">
                        <FontAwesome6 name="image" size={20} color="#6B7280" />
                        <Text className="text-gray-500 text-sm mt-1">添加图片</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* 载入备份密码验证弹窗 */}
        <Modal visible={importPasswordModalVisible} transparent animationType="fade">
          <View className="flex-1 bg-black/50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 w-4/5 max-w-80">
              <Text className="text-lg font-bold text-foreground text-center mb-4">验证密码</Text>
              <Text className="text-sm text-muted text-center mb-4">请输入小秘密密码以确认载入备份</Text>
              <TextInput
                value={importPassword}
                onChangeText={setImportPassword}
                placeholder="输入密码"
                secureTextEntry
                className="bg-gray-100 rounded-xl px-4 py-3 text-foreground mb-4"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
              <View className="flex-row justify-between">
                <TouchableOpacity
                  onPress={() => {
                    setImportPasswordModalVisible(false);
                    setImportPassword('');
                  }}
                  className="flex-1 mr-2 py-3 rounded-xl bg-gray-100"
                >
                  <Text className="text-center text-foreground font-medium">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmImport}
                  className="flex-1 ml-2 py-3 rounded-xl bg-accent"
                >
                  <Text className="text-center text-white font-medium">确认</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
