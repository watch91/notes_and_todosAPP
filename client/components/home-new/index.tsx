import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, Modal, useWindowDimensions, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

// 静态兜底封面池（从 picture/ 目录复制而来）
const FALLBACK_COVERS: number[] = [
  require('@/assets/cover-pictures/OIP-C.jpg'),
  require('@/assets/cover-pictures/OIP-C (1).jpg'),
  require('@/assets/cover-pictures/OIP-C (2).jpg'),
  require('@/assets/cover-pictures/OIP-C (3).jpg'),
  require('@/assets/cover-pictures/OIP-C (4).jpg'),
  require('@/assets/cover-pictures/OIP-C (5).jpg'),
  require('@/assets/cover-pictures/OIP-C (6).jpg'),
  require('@/assets/cover-pictures/OIP-C (7).jpg'),
];

// 用 note.id 作为种子从兜底池中稳定地选一张封面（避免瀑布流刷新跳动）
function pickFallbackCover(noteId: number): number {
  const stableSeed = (noteId * 9301 + 49297) % 233280;
  return FALLBACK_COVERS[stableSeed % FALLBACK_COVERS.length];
}

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

// 屏蔽关键词（与旧首页保持一致）
const BLOCK_KEYWORDS = ['更新公告', 'test', '公告'];

// 顶部 Tab 分类
const TOP_CATEGORIES = [
  { key: 'all', label: '推荐', labelId: null as number | null },
  { key: '1', label: '随笔', labelId: 1 as number | null },
  { key: '2', label: '感悟', labelId: 2 as number | null },
  { key: '3', label: '知识', labelId: 3 as number | null },
  { key: '9', label: '旅行', labelId: 9 as number | null },
  { key: '8', label: '美食', labelId: 8 as number | null },
  { key: '10', label: '穿搭', labelId: 10 as number | null },
  { key: '13', label: '生活', labelId: 13 as number | null },
  { key: '6', label: '影视', labelId: 6 as number | null },
];

interface MasonryItem {
  id: number;
  title: string;
  content: string;
  images: string[];
  aspectRatio: number;
  label_1?: number | null;
  author_name: string;
  collaborator_count: number;
  updated_at: string;
}

// 为每个 item 计算一个稳定的、随机的 aspectRatio（保证瀑布流错落）
function assignAspectRatios(items: MasonryItem[]): MasonryItem[] {
  return items.map((item) => {
    // 用 id 作种子，让同一张卡片的比例稳定（避免瀑布流高度跳动）
    const stableSeed = (item.id * 9301 + 49297) % 233280;
    const r = stableSeed / 233280;
    let ratio: number;
    if (r < 0.3) {
      // 偏长（0.55 - 0.7） -> 制造流动感
      ratio = 0.55 + ((stableSeed % 100) / 100) * 0.15;
    } else if (r < 0.8) {
      // 常规（0.75 - 1.05） -> 填充基底
      ratio = 0.75 + ((stableSeed % 100) / 100) * 0.3;
    } else {
      // 偏扁（1.1 - 1.4） -> 制造缺口
      ratio = 1.1 + ((stableSeed % 100) / 100) * 0.3;
    }
    return { ...item, aspectRatio: Math.max(0.5, Math.min(1.4, ratio)) };
  });
}

// 贪心分配算法：把每张卡片分配到当前最矮的那一列
function distributeItems<T extends MasonryItem>(
  items: T[],
  columnWidth: number,
  columns = 2
) {
  const TITLE_AREA_HEIGHT = 64;
  const columnArrays: T[][] = Array.from({ length: columns }, () => []);
  const columnHeights: number[] = Array(columns).fill(0);

  items.forEach((item) => {
    const imgHeight = columnWidth / item.aspectRatio;
    const totalItemHeight = imgHeight + TITLE_AREA_HEIGHT;
    const shortestIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columnArrays[shortestIndex].push(item);
    columnHeights[shortestIndex] += totalItemHeight;
  });

  return columnArrays;
}

// 模拟点赞数（无后端字段，本地根据 id 生成稳定数字）
function computeMockLikes(id: number): number {
  const seed = (id * 9301 + 49297) % 233280;
  return Math.floor((seed / 233280) * 9900) + 100;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

// 单卡片组件（顶层定义，避免每次 render 创建新组件）
interface NoteCardProps {
  item: MasonryItem;
  columnWidth: number;
  onPress: (item: MasonryItem) => void;
}

/**
 * 单卡片组件：渲染时直接去 pictures 表查询当前笔记的封面附件。
 * - 若 pictures 表中存在 note_id = note.id 的记录，取最新一行（接口已按 id DESC 排序）的 image_url 作为封面
 * - 若不存在，使用本地静态风景图兜底
 */
function NoteCard({ item, columnWidth, onPress }: NoteCardProps) {
  const imgHeight = columnWidth / item.aspectRatio;
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCover = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/pictures/note/${item.id}`);
        const json = await res.json();
        // 接口可能直接返回数组，也可能包装在 {data: [...]} 里，两种都处理
        const list: Array<any> = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : [];
        // 接口已按 created_at ASC 排序，取最新一行（最后一张）
        const latest = list[list.length - 1];
        if (!cancelled) {
          setCoverUrl(latest?.image_url ?? null);
          setCoverLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setCoverUrl(null);
          setCoverLoaded(true);
        }
      }
    };
    fetchCover();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  // 封面优先级：pictures 表查询到的真实附件 → 本地静态兜底池（保证不空白）
  const remoteCover = coverUrl && coverUrl.trim().length > 0 ? coverUrl : null;
  const coverSource = remoteCover ? { uri: remoteCover } : pickFallbackCover(item.id);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View style={{ width: columnWidth, height: imgHeight, backgroundColor: '#F1F5F9' }}>
        {coverLoaded && coverSource ? (
          <Image
            source={coverSource}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <FontAwesome6 name="image" size={28} color="#CBD5E1" />
          </View>
        )}
        {item.collaborator_count > 0 && (
          <View className="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-0.5 flex-row items-center">
            <FontAwesome6 name="user-group" size={9} color="white" />
            <Text className="text-white text-[10px] ml-1">{item.collaborator_count}</Text>
          </View>
        )}
      </View>
      <View className="p-2.5">
        <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
          {item.title}
        </Text>
        <View className="flex-row items-center mt-1.5">
          <View className="w-4 h-4 rounded-full bg-blue-100 items-center justify-center mr-1">
            <FontAwesome6 name="user" size={8} color="#3B82F6" />
          </View>
          <Text className="text-[11px] text-muted flex-1" numberOfLines={1}>
            {item.author_name}
          </Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-[10px] text-muted">
            {formatRelativeTime(item.updated_at)}
          </Text>
          <View className="flex-row items-center">
            <FontAwesome6 name="heart" size={10} color="#3B82F6" />
            <Text className="text-[10px] text-muted ml-1">
              {computeMockLikes(item.id)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomePage() {
  const router = useSafeRouter();
  const { width } = useWindowDimensions();

  const [items, setItems] = useState<MasonryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MasonryItem[] | null>(null);
  const [屏蔽过滤开关, set屏蔽过滤开关] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showLoginWarning, setShowLoginWarning] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const COLUMNS = 2;
  const GAP = 12;
  const PADDING = 16;
  const COLUMN_WIDTH = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const agreed = await AsyncStorage.getItem('agreement_agreed');
        if (mounted && !agreed) setShowAgreement(true);
      } catch (e) {
        console.error('Failed to check agreement:', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAgree = async () => {
    try {
      await AsyncStorage.setItem('agreement_agreed', 'true');
      setShowAgreement(false);
    } catch (e) {
      console.error('Failed to save agreement:', e);
    }
  };

  const handleDisagree = () => {
    Linking.openURL('https://www.baidu.com');
  };

  const handleCreateNote = async () => {
    setModalVisible(false);
    const userId = await AsyncStorage.getItem('user_id');
    if (!userId) {
      setShowLoginWarning(true);
    } else {
      router.push('/note-edit', {});
    }
  };

  const handleGoToLogin = () => {
    setShowLoginWarning(false);
    router.push('/login', {});
  };

  const handleContinueAnonymous = () => {
    setShowLoginWarning(false);
    router.push('/note-edit', {});
  };

  const fetchData = useCallback(async () => {
    try {
      logger.info('首页', `开始获取随机推荐笔记（分类：${activeCategory}）`);
      const params = new URLSearchParams({ limit: '30' });
      const category = TOP_CATEGORIES.find((c) => c.key === activeCategory);
      if (category?.labelId != null) {
        params.set('label', String(category.labelId));
      }
      const res = await fetch(`${API_BASE}/api/v1/notes/recommend?${params.toString()}`);
      const data = await res.json();

      const list: MasonryItem[] = (data.data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content || '',
        images: Array.isArray(n.images) ? n.images : [],
        aspectRatio: 1,
        label_1: n.label_1 ?? null,
        author_name: n.author_name || '匿名用户',
        collaborator_count: n.collaborator_count || 0,
        updated_at: n.updated_at,
      }));

      setItems(assignAspectRatios(list));
      logger.info('首页', `随机推荐加载完成，共${list.length}条`);
    } catch (error) {
      logger.error('首页', error instanceof Error ? error : new Error(String(error)));
    }
  }, [activeCategory]);

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
        setSearchResults(
          assignAspectRatios(
            (data.data || []).map((n: any) => ({
              id: n.id,
              title: n.title,
              content: n.content || '',
              images: Array.isArray(n.images) ? n.images : [],
              aspectRatio: 1,
              label_1: n.label_1 ?? null,
              author_name: n.author_name || '匿名用户',
              collaborator_count: n.collaborator_count || 0,
              updated_at: n.updated_at,
            }))
          )
        );
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const filteredItems = useMemo(() => {
    const source = searchResults !== null ? searchResults : items;
    return source.filter((item) => {
      if (屏蔽过滤开关 && BLOCK_KEYWORDS.some((kw) => item.title.includes(kw))) {
        return false;
      }
      return true;
    });
  }, [items, searchResults, 屏蔽过滤开关]);

  const columnData = useMemo(
    () => distributeItems(filteredItems, COLUMN_WIDTH, COLUMNS),
    [filteredItems, COLUMN_WIDTH]
  );

  const handleCardPress = useCallback(
    (item: MasonryItem) => {
      router.push('/note-edit', { id: item.id, title: item.title, content: item.content });
    },
    [router]
  );

  return (
    <Screen>
      <View className="flex-1 bg-background">
        {/* 顶部 Header */}
        <View className="px-5 pt-3 pb-2 flex-row items-center">
          <Text className="text-xl font-bold text-foreground">笔记广场</Text>
          <View className="flex-1" />
          <TouchableOpacity
            onPress={() => router.push('/creative-hall', {})}
            className="px-2"
          >
            <FontAwesome6 name="lightbulb" size={18} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* 搜索栏 */}
        <View className="px-5 pb-2">
          <View className="bg-white rounded-full flex-row items-center px-4 py-2.5">
            <FontAwesome6 name="magnifying-glass" size={14} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="搜索笔记..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-sm text-foreground"
              style={{ outline: 'none', padding: 0 }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <FontAwesome6 name="circle-xmark" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 分类 Tab 横向滚动 */}
        <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: PADDING, gap: 16, alignItems: 'center' }}
          className="pb-2"
        >
          {TOP_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setActiveCategory(cat.key)}
                className="items-center"
              >
                <Text
                  className={`text-base ${isActive ? 'font-bold text-foreground' : 'font-medium text-muted'}`}
                >
                  {cat.label}
                </Text>
                {isActive && (
                  <View className="h-1 w-6 bg-blue-500 rounded-full mt-1" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </View>

        {/* 屏蔽开关 */}
        <View className="px-5 pb-2 flex-row items-center justify-end">
          <Text className="text-xs text-muted mr-2">屏蔽测试笔记</Text>
          <TouchableOpacity
            className={`w-10 h-6 rounded-full p-0.5 ${屏蔽过滤开关 ? 'bg-blue-500' : 'bg-gray-300'}`}
            onPress={() => set屏蔽过滤开关(!屏蔽过滤开关)}
          >
            <View className={`w-5 h-5 rounded-full bg-white ${屏蔽过滤开关 ? 'ml-4' : 'ml-0'}`} />
          </TouchableOpacity>
        </View>

        {/* 内容区：双列瀑布流 */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
          contentContainerStyle={{ paddingHorizontal: PADDING, paddingBottom: 96 }}
        >
          {filteredItems.length === 0 ? (
            <View className="items-center justify-center py-24">
              <FontAwesome6 name="compass" size={48} color="#CBD5E1" />
              <Text className="text-muted mt-4 text-base">
                {searchQuery ? '未找到相关笔记' : '暂无内容'}
              </Text>
              <Text className="text-sm text-muted mt-1">
                {searchQuery ? '尝试其他关键词' : '点击下方按钮添加笔记'}
              </Text>
            </View>
          ) : (
            <View className="flex-row" style={{ gap: GAP }}>
              {columnData.map((colItems, colIndex) => (
                <View key={colIndex} className="flex-1" style={{ gap: GAP }}>
                  {colItems.map((item) => (
                    <NoteCard
                      key={item.id}
                      item={item}
                      columnWidth={COLUMN_WIDTH}
                      onPress={handleCardPress}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* FAB 新建 */}
        <View className="absolute bottom-6 right-5">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="w-14 h-14 rounded-full bg-blue-500 items-center justify-center"
            style={{
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <FontAwesome6 name="plus" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* 新建内容 Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
            className="flex-1 bg-black/40 justify-end"
          >
            <TouchableOpacity activeOpacity={1} className="w-full bg-white rounded-t-3xl p-6 pb-10">
              <View className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
              <Text className="text-lg font-bold text-foreground mb-4">新建内容</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleCreateNote}
                  className="flex-1 bg-blue-50 rounded-2xl p-5 items-center"
                >
                  <View className="w-12 h-12 rounded-xl bg-blue-500 items-center justify-center mb-3">
                    <FontAwesome6 name="note-sticky" size={20} color="white" />
                  </View>
                  <Text className="font-medium text-foreground">笔记</Text>
                  <Text className="text-xs text-muted mt-1">记录想法</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    router.push('/voice-record', {});
                  }}
                  className="flex-1 bg-violet-50 rounded-2xl p-5 items-center"
                >
                  <View className="w-12 h-12 rounded-xl bg-violet-500 items-center justify-center mb-3">
                    <FontAwesome6 name="microphone" size={20} color="white" />
                  </View>
                  <View className="flex-row items-center">
                    <Text className="font-medium text-foreground">听音速记</Text>
                    <View className="ml-2 px-1.5 py-0.5 bg-violet-500 rounded">
                      <Text className="text-[10px] text-white font-bold">Beta</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted mt-1">语音转文字</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 协议 Modal */}
        <Modal visible={showAgreement} transparent animationType="fade">
          <View className="flex-1 bg-black/50 items-center justify-center p-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <Text className="text-lg font-bold text-center text-foreground mb-3">
                用户使用协议
              </Text>
              <Text className="text-sm text-muted mb-5 leading-relaxed">
                欢迎使用本应用。请您在使用前仔细阅读《用户协议》和《隐私政策》。点击「同意」表示您已阅读并同意全部条款。
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-3"
                  onPress={handleDisagree}
                >
                  <Text className="text-center text-gray-600 font-medium">不同意</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-blue-500 rounded-xl py-3"
                  onPress={handleAgree}
                >
                  <Text className="text-center text-white font-medium">同意</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 登录提示 Modal */}
        <Modal visible={showLoginWarning} transparent animationType="fade">
          <View className="flex-1 bg-black/60 items-center justify-center p-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <Text className="text-lg font-bold text-center text-foreground mb-3">
                需要登录
              </Text>
              <Text className="text-sm text-muted mb-5 text-center leading-relaxed">
                创建笔记需要登录您的账号才能保存到云端。继续匿名使用将无法保存笔记。
              </Text>
              <View className="flex-row gap-3 mb-2">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-3"
                  onPress={handleContinueAnonymous}
                >
                  <Text className="text-center text-gray-600 font-medium">继续匿名</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-blue-500 rounded-xl py-3"
                  onPress={handleGoToLogin}
                >
                  <Text className="text-center text-white font-medium">去登录</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}