import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useState, useEffect } from 'react';
import { Screen } from '@/components/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

interface StarWisdomCache {
  quote: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

const CACHE_KEY = '@starry_wisdom_cache';

// 星空背景（纯代码实现）
const StarryBackground = () => (
  <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />
);

export default function StarryWisdomScreen() {
  const router = useSafeRouter();
  const [quote, setQuote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // 使用 useState 存储动画值，避免 ref 在 render 中访问的问题
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [opacityAnim] = useState(() => new Animated.Value(1));

  // 获取今天的日期字符串
  const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // 检查缓存
  const checkCache = async (): Promise<StarWisdomCache | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: StarWisdomCache = JSON.parse(cached);
        const today = getTodayString();
        if (data.date === today) {
          return data;
        }
      }
    } catch (e) {
      console.error('Failed to load cache:', e);
    }
    return null;
  };

  // 保存缓存
  const saveCache = async (quote: string) => {
    try {
      const now = new Date();
      const data: StarWisdomCache = {
        quote,
        date: getTodayString(),
        timestamp: now.getTime(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save cache:', e);
    }
  };

  // 调用AI生成星语
  const fetchStarWisdom = async (): Promise<string> => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/llm/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: '请生成一句简短的、治愈的哲理金句或座右铭，要求：1.不超过30字 2.温暖治愈 3.富有哲理 4.只输出句子本身，不要任何解释。',
            },
          ],
          model: 'doubao-seed-2-0-mini-260215',
        }),
      });
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '星辰指引，心灵自明';
    } catch (e) {
      console.error('Failed to fetch star wisdom:', e);
      return '星辰指引，心灵自明';
    }
  };

  // 星星翻转动画
  const startFlipAnimation = async () => {
    setIsLoading(true);
    setShowQuote(false);

    // 开始翻转动画
    Animated.sequence([
      // 缩小
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // 翻转
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      // 恢复
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 同时获取AI结果
    const newQuote = await fetchStarWisdom();
    
    // 动画结束后显示结果
    setTimeout(() => {
      setQuote(newQuote);
      setShowQuote(true);
      setIsLoading(false);
      saveCache(newQuote);
    }, 1500);
  };

  // 初始化
  useEffect(() => {
    const init = async () => {
      const cached = await checkCache();
      if (cached) {
        setQuote(cached.quote);
        setShowQuote(true);
        setIsFirstLoad(false);
      }
    };
    init();
  }, []);

  // 计算旋转角度
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const starStyle = {
    transform: [
      { rotateY: rotateInterpolate },
      { scale: scaleAnim },
    ],
    opacity: opacityAnim,
  };

  const handleStarPress = () => {
    if (!isLoading && !showQuote) {
      startFlipAnimation();
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* 背景 */}
        <StarryBackground />
        
        {/* 返回按钮 */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        
        {/* 装饰星星 */}
        <View style={styles.decorStar1}>
          <Text style={styles.decorStarText}>✦</Text>
        </View>
        <View style={styles.decorStar2}>
          <Text style={styles.decorStarText}>✧</Text>
        </View>
        <View style={styles.decorStar3}>
          <Text style={styles.decorStarText}>⋆</Text>
        </View>

        {/* 主内容 */}
        <View style={styles.content}>
          {/* 标题 */}
          <Text style={styles.pageTitle}>星垂悟心</Text>
          <Text style={styles.pageSubtitle}>仰望星空，聆听心灵的低语</Text>

          {/* 五角星 */}
          <TouchableOpacity
            style={styles.starContainer}
            onPress={handleStarPress}
            activeOpacity={0.8}
            disabled={isLoading || showQuote}
          >
            <Animated.View style={[styles.starWrapper, starStyle]}>
              <View style={styles.star}>
                <Text style={styles.starIcon}>★</Text>
                {!showQuote && !isLoading && (
                  <Text style={styles.starHint}>点击查看今日星语</Text>
                )}
                {isLoading && (
                  <Text style={styles.starHint}>聆听中...</Text>
                )}
                {showQuote && (
                  <Text style={styles.quoteText}>{quote}</Text>
                )}
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* 底部提示 */}
          {showQuote && (
            <>
              <TouchableOpacity
                style={styles.saveTodoButton}
                onPress={() => {
                  router.push('/todo-edit', { content: `星垂悟心：${quote}` });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.saveTodoButtonText}>📝 保存到待办</Text>
              </TouchableOpacity>
              <Text style={styles.footerText}>明日再来，聆听新的星语</Text>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 200, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFACD', // 淡黄色
    fontWeight: 'bold',
    marginTop: -2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 30, 0.6)',
  },
  gradientBg: {
    backgroundColor: '#0a0a1e',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(100, 150, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  pageSubtitle: {
    fontSize: 14,
    color: 'rgba(200, 220, 255, 0.8)',
    marginBottom: 60,
  },
  starContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(100, 150, 255, 0.2)',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(150, 200, 255, 0.5)',
    shadowColor: '#6496ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    padding: 20,
  },
  starIcon: {
    fontSize: 60,
    color: '#ffd700',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  starHint: {
    fontSize: 12,
    color: 'rgba(200, 220, 255, 0.9)',
    textAlign: 'center',
  },
  quoteText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  saveTodoButton: {
    marginTop: 30,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(100, 150, 255, 0.3)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(150, 200, 255, 0.5)',
  },
  saveTodoButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(200, 220, 255, 0.6)',
    marginTop: 40,
  },
  // 装饰星星
  decorStar1: {
    position: 'absolute',
    top: 100,
    left: 40,
  },
  decorStar2: {
    position: 'absolute',
    top: 150,
    right: 50,
  },
  decorStar3: {
    position: 'absolute',
    bottom: 200,
    left: 60,
  },
  decorStarText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
