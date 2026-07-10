import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome6 } from '@expo/vector-icons';

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

// 音乐播放器组件
const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // TODO: 用户提供的音乐文件路径
  const MUSIC_URI = ''; // 等待用户提供音乐文件

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(async () => {
        if (soundRef.current) {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            if (status.didJustFinish) {
              setIsPlaying(false);
              await soundRef.current.setPositionAsync(0);
              setPosition(0);
            }
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = async () => {
    if (!MUSIC_URI) {
      // 音乐文件未配置
      return;
    }

    try {
      if (!soundRef.current) {
        setIsLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: MUSIC_URI },
          { shouldPlay: false, isLooping: false },
          (status) => {
            if (status.isLoaded) {
              setDuration(status.durationMillis || 0);
            }
          }
        );
        soundRef.current = sound;
        setIsLoading(false);
      }

      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.positionMillis >= (status.durationMillis || 0)) {
          await soundRef.current.setPositionAsync(0);
          setPosition(0);
        }
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('播放错误:', error);
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  if (!MUSIC_URI) {
    return null; // 音乐文件未配置时不显示播放器
  }

  return (
    <View style={styles.playerContainer}>
      <LinearGradient
        colors={['rgba(74, 20, 140, 0.8)', 'rgba(123, 31, 162, 0.6)']}
        style={styles.playerCard}
      >
        {/* 唱片图标 */}
        <View style={styles.albumArt}>
          <FontAwesome6 name="compact-disc" size={40} color="#fff" />
        </View>

        {/* 播放控制 */}
        <View style={styles.playerControls}>
          <TouchableOpacity onPress={togglePlay} disabled={isLoading} style={styles.playButton}>
            <FontAwesome6 
              name={isLoading ? 'spinner' : isPlaying ? 'pause' : 'play'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>

          {/* 进度条 */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default function CreativeHallScreen() {
  const router = useSafeRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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

          {/* 音乐播放器 */}
          <MusicPlayer />

          {/* 底部装饰 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>~ 更多功能即将上线 ~</Text>
          </View>
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
  },
  grid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#9c27b0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    width: 45,
    height: 45,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
  enterHint: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  enterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  // 音乐播放器样式
  playerContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  albumArt: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerControls: {
    flex: 1,
    gap: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
