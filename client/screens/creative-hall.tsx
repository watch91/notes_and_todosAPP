import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

const features: { id: string; title: string; desc: string; icon: any; route: string; gradient: string[] }[] = [
  {
    id: 'starry-wisdom',
    title: '星垂悟心',
    desc: '仰望星空，聆听心灵的低语',
    icon: require('@/assets/无标题.png'),
    route: '/starry-wisdom',
    gradient: ['#4a148c', '#7b1fa2', '#9c27b0'],
  },
];

// 装饰性星星组件
const DecorativeStar = ({ style, size = 4, opacity = 0.6 }: { style?: any; size?: number; opacity?: number }) => (
  <View style={[styles.decorativeStar, { width: size, height: size, opacity }, style]} />
);

export default function CreativeHallScreen() {
  const router = useSafeRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [showPlayer, setShowPlayer] = useState(false);

  // 检查是否为2026年7月10日
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() 返回 0-11
    const day = now.getDate();
    
    if (year === 2026 && month === 7 && day === 10) {
      setShowPlayer(true);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Screen>
      <View style={styles.container}>
        {/* 渐变背景 */}
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* 装饰性星星 */}
        <DecorativeStar style={{ top: 80, left: 30 }} size={3} opacity={0.4} />
        <DecorativeStar style={{ top: 120, right: 50 }} size={5} opacity={0.6} />
        <DecorativeStar style={{ top: 200, left: 60 }} size={4} opacity={0.5} />
        <DecorativeStar style={{ top: 180, right: 80 }} size={3} opacity={0.3} />
        <DecorativeStar style={{ top: 300, left: 40 }} size={6} opacity={0.7} />
        <DecorativeStar style={{ top: 350, right: 30 }} size={4} opacity={0.5} />
        <DecorativeStar style={{ top: 450, left: 70 }} size={3} opacity={0.4} />
        <DecorativeStar style={{ top: 500, right: 60 }} size={5} opacity={0.6} />
        <DecorativeStar style={{ top: 600, left: 50 }} size={4} opacity={0.5} />
        <DecorativeStar style={{ top: 650, right: 40 }} size={3} opacity={0.4} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 标题区域 */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.titleGlow} />
            <Text style={styles.title}>✨ 创意大厅 ✨</Text>
            <Text style={styles.subtitle}>探索更多有趣的功能</Text>
          </Animated.View>

          {/* 功能卡片 */}
          <View style={styles.grid}>
            {features.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.cardWrapper}
                onPress={() => router.push(feature.route as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4a148c', '#7b1fa2', '#9c27b0']}
                  style={styles.card}
                >
                  {/* 卡片光晕 */}
                  <View style={styles.cardGlow} />
                  
                  <View style={styles.iconContainer}>
                    <Image source={feature.icon} style={styles.icon} resizeMode="contain" />
                  </View>
                  <Text style={styles.cardTitle}>{feature.title}</Text>
                  <Text style={styles.cardDesc}>{feature.desc}</Text>
                  
                  {/* 进入提示 */}
                  <View style={styles.enterHint}>
                    <Text style={styles.enterText}>点击进入 →</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* 底部装饰 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>~ 更多功能即将上线 ~</Text>
          </View>

          {/* 网易云音乐播放器 - 仅在2026年7月10日显示 */}
          {showPlayer && (
            <View style={styles.playerContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  src="https://music.163.com/outchain/player?type=2&id=1973665667&auto=1&height=66"
                  width={330}
                  height={86}
                  frameBorder="no"
                  style={{ border: 'none', borderRadius: 12 }}
                  allow="autoplay"
                />
              ) : (
                <WebView
                  source={{ uri: 'https://music.163.com/outchain/player?type=2&id=1973665667&auto=1&height=66' }}
                  style={styles.player}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback={true}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  decorativeStar: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    padding: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  titleGlow: {
    position: 'absolute',
    width: 200,
    height: 60,
    backgroundColor: 'rgba(156, 39, 176, 0.3)',
    borderRadius: 30,
    top: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(156, 39, 176, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    letterSpacing: 2,
  },
  grid: {
    padding: 20,
    alignItems: 'center',
  },
  cardWrapper: {
    width: width - 60,
    marginBottom: 20,
    shadowColor: '#9c27b0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 75,
    top: -30,
    right: -30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    width: 50,
    height: 50,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  enterHint: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  enterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 2,
  },
  playerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  player: {
    width: 330,
    height: 86,
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
});
