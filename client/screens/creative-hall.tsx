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

// 音乐播放器组件（7月10日彩蛋）
const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const MUSIC_URI = 'https://coze-coding-project.tos.coze.site/coze_storage_7637904258242707508/%E6%B5%B7%E5%B1%BF%E4%BD%A0%EF%BC%88%E5%88%9B%E6%84%8F%E5%A4%A7%E5%8E%85%E5%BD%A9%E8%9B%8B%E9%9F%B3%E4%B9%90%EF%BC%89.mp3?sign=1846755407-d1aab08080-0-2be24455441391e1062adb32b34d4e0e0611de4f753860b3ce81c9c85ad17eea';

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const autoPlay = async () => {
      if (!MUSIC_URI) return;
      try {
        setIsLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: MUSIC_URI },
          { shouldPlay: true, isLooping: false },
          (status) => {
            if (status.isLoaded) {
              setDuration(status.durationMillis || 0);
              setIsLoading(false);
            }
          }
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } catch (error) {
        console.error('自动播放错误:', error);
        setIsLoading(false);
      }
    };
    autoPlay();
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
    if (!MUSIC_URI) return;
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

  if (!MUSIC_URI) return null;

  return (
    <View style={styles.playerContainer}>
      <Text style={styles.playerQuote}>为何你偏要仓促抽身远行，我苦苦哀求，求你别离开我</Text>
      <LinearGradient
        colors={['rgba(74, 20, 140, 0.8)', 'rgba(123, 31, 162, 0.6)']}
        style={styles.playerCard}
      >
        <View style={styles.albumArt}>
          <FontAwesome6 name="compact-disc" size={40} color="#fff" />
        </View>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle}>海屿你</Text>
          <Text style={styles.songArtist}>马也_Crabbit</Text>
        </View>
        <View style={styles.playerControls}>
          <TouchableOpacity onPress={togglePlay} disabled={isLoading} style={styles.playButton}>
            <FontAwesome6 
              name={isLoading ? 'spinner' : isPlaying ? 'pause' : 'play'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
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

// 钻石音乐播放器组件（7月15日彩蛋）
const DiamondPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const MUSIC_URI = 'https://coze-coding-project.tos.coze.site/coze_storage_7637904258242707508/%E7%88%B1%E9%94%99%EF%BC%88%E5%88%9B%E6%84%8F%E5%A4%A7%E5%8E%85%E5%BD%A9%E8%9B%8B%E9%9F%B3%E4%B9%90%EF%BC%89.mp3?sign=1847248022-cae9c26eb3-0-a9676ac216b12319000eeccad448b2cf83b1db01383e9c6e80d0e39a23075c3c';

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const autoPlay = async () => {
      if (!MUSIC_URI) return;
      try {
        setIsLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: MUSIC_URI },
          { shouldPlay: true, isLooping: false },
          (status) => {
            if (status.isLoaded) {
              setDuration(status.durationMillis || 0);
              setIsLoading(false);
            }
          }
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } catch (error) {
        console.error('自动播放错误:', error);
        setIsLoading(false);
      }
    };
    autoPlay();
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
    if (!MUSIC_URI) return;
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

  if (!MUSIC_URI) return null;

  return (
    <View style={styles.playerContainer}>
      <Text style={styles.diamondQuote}>非洲之星是世界上最大的钻石，璀璨夺目，象征着永恒的爱情</Text>
      <LinearGradient
        colors={['rgba(139, 69, 19, 0.8)', 'rgba(218, 165, 32, 0.6)']}
        style={styles.diamondPlayerCard}
      >
        <View style={styles.diamondIcon}>
          <FontAwesome6 name="gem" size={40} color="#fff" />
        </View>
        <View style={styles.diamondSongInfo}>
          <Text style={styles.diamondSongTitle}>爱错</Text>
          <Text style={styles.diamondSongArtist}>王力宏</Text>
        </View>
        <View style={styles.diamondControls}>
          <TouchableOpacity onPress={togglePlay} disabled={isLoading} style={styles.diamondPlayButton}>
            <FontAwesome6 
              name={isLoading ? 'spinner' : isPlaying ? 'pause' : 'play'} 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>
          <View style={styles.diamondProgressContainer}>
            <View style={styles.diamondProgressBar}>
              <View style={[styles.diamondProgressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.diamondTimeContainer}>
              <Text style={styles.diamondTimeText}>{formatTime(position)}</Text>
              <Text style={styles.diamondTimeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// 新增：8月5日彩蛋 - 《世界上的另一个你》
const AnotherYouPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const MUSIC_URI = 'https://kw-er.kuwo.cn/fd3c92cc8446004b1bd30d255837ce66/6a731c5e/resource/30106/trackmedia/M500003SWXjj3QTdo6.mp3';

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const autoPlay = async () => {
      if (!MUSIC_URI) return;
      try {
        setIsLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: MUSIC_URI },
          { shouldPlay: true, isLooping: false },
          (status) => {
            if (status.isLoaded) {
              setDuration(status.durationMillis || 0);
              setIsLoading(false);
            }
          }
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } catch (error) {
        console.error('自动播放错误:', error);
        setIsLoading(false);
      }
    };
    autoPlay();
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
    if (!MUSIC_URI) return;
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

  if (!MUSIC_URI) return null;

  return (
    <View style={styles.playerContainer}>
      <Text style={styles.anotherYouQuote}>“你感受我，就像我感受你”</Text>
      <LinearGradient
        colors={['rgba(255, 69, 0, 0.8)', 'rgba(255, 140, 0, 0.6)']}
        style={styles.anotherYouPlayerCard}
      >
        <View style={styles.anotherYouIcon}>
          <FontAwesome6 name="sun" size={40} color="#fff" />
        </View>
        <View style={styles.anotherYouSongInfo}>
          <Text style={styles.anotherYouSongTitle}>世界上的另一个我</Text>
          <Text style={styles.anotherYouSongArtist}>阿肆、郭采洁</Text>
        </View>
        <View style={styles.anotherYouControls}>
          <TouchableOpacity onPress={togglePlay} disabled={isLoading} style={styles.anotherYouPlayButton}>
            <FontAwesome6 
              name={isLoading ? 'spinner' : isPlaying ? 'pause' : 'play'} 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>
          <View style={styles.anotherYouProgressContainer}>
            <View style={styles.anotherYouProgressBar}>
              <View style={[styles.anotherYouProgressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.anotherYouTimeContainer}>
              <Text style={styles.anotherYouTimeText}>{formatTime(position)}</Text>
              <Text style={styles.anotherYouTimeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default function CreativeHallScreen() {
  const router = useSafeRouter();
  const fadeAnim = useRef(new Animated.Value(0));
  const scaleAnim = useRef(new Animated.Value(0.9));
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDiamondPlayer, setShowDiamondPlayer] = useState(false);
  const [showAnotherYouPlayer, setShowAnotherYouPlayer] = useState(false);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    if (year === 2026 && month === 7 && day === 10) {
      setShowPlayer(true);
    }
    if (year === 2026 && month === 7 && day === 15) {
      setShowDiamondPlayer(true);
    }
    if (year === 2026 && month === 7 && day === 27) {
      setShowAnotherYouPlayer(true);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim.current, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim.current, {
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
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          style={StyleSheet.absoluteFill}
        />
        
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
          {/* eslint-disable react-hooks/refs */}
          <Animated.View style={[styles.header, { opacity: fadeAnim.current, transform: [{ scale: scaleAnim.current }] }]}>
          {/* eslint-enable react-hooks/refs */}
            <View style={styles.titleGlow} />
            <Text style={styles.title}>创意大厅</Text>
            <Text style={styles.subtitle}>探索更多有趣的功能</Text>
          </Animated.View>

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
                  <View style={styles.cardGlow} />
                  <View style={styles.iconContainer}>
                    <Image source={feature.icon} style={styles.icon} resizeMode="contain" />
                  </View>
                  <Text style={styles.cardTitle}>{feature.title}</Text>
                  <Text style={styles.cardDesc}>{feature.desc}</Text>
                  <View style={styles.enterHint}>
                    <Text style={styles.enterText}>点击进入 →</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {showPlayer && <MusicPlayer />}
          {showDiamondPlayer && <DiamondPlayer />}
          {showAnotherYouPlayer && <AnotherYouPlayer />}

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
  // 第一个播放器（海屿你）
  playerContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  playerQuote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    width: '100%',
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
    gap: 2,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  songArtist: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  playerControls: {
    gap: 8,
    alignItems: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: 120,
    gap: 4,
  },
  progressBar: {
    height: 3,
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
  // 钻石播放器（爱错）
  diamondQuote: {
    fontSize: 15,
    color: 'rgba(255, 215, 0, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
    paddingHorizontal: 20,
    fontWeight: '500',
    textShadowColor: 'rgba(218, 165, 32, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  diamondPlayerCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    width: '100%',
  },
  diamondIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  diamondSongInfo: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  diamondSongTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(218, 165, 32, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  diamondSongArtist: {
    fontSize: 13,
    color: 'rgba(255, 215, 0, 0.8)',
  },
  diamondControls: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  diamondPlayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  diamondProgressContainer: {
    width: '100%',
    gap: 6,
  },
  diamondProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  diamondProgressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  diamondTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  diamondTimeText: {
    fontSize: 12,
    color: 'rgba(255, 215, 0, 0.8)',
  },
  // 新增播放器（世界上的另一个你）
  anotherYouQuote: {
    fontSize: 15,
    color: 'rgba(255, 140, 0, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
    paddingHorizontal: 20,
    fontWeight: '500',
    textShadowColor: 'rgba(255, 69, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  anotherYouPlayerCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    width: '100%',
  },
  anotherYouIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  anotherYouSongInfo: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  anotherYouSongTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(255, 69, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  anotherYouSongArtist: {
    fontSize: 13,
    color: 'rgba(255, 140, 0, 0.8)',
  },
  anotherYouControls: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  anotherYouPlayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  anotherYouProgressContainer: {
    width: '100%',
    gap: 6,
  },
  anotherYouProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  anotherYouProgressFill: {
    height: '100%',
    backgroundColor: '#FF8C00',
    borderRadius: 2,
  },
  anotherYouTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  anotherYouTimeText: {
    fontSize: 12,
    color: 'rgba(255, 140, 0, 0.8)',
  },
});