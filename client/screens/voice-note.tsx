import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSafeSearchParams } from '@/hooks/useSafeRouter';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function VoiceNotePage() {
  const router = useSafeRouter();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要麦克风权限才能录音');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('错误', '启动录音失败');
    }
  };

  const pauseRecording = async () => {
    if (!recording) return;
    try {
      if (isPaused) {
        await recording.startAsync();
        setIsPaused(false);
        timerRef.current = setInterval(() => {
          setDuration((d) => d + 1);
        }, 1000);
      } else {
        await recording.pauseAsync();
        setIsPaused(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    } catch (error) {
      console.error('Pause error:', error);
    }
  };

  const stopAndSave = async () => {
    if (!recording) return;

    setIsSaving(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        Alert.alert('错误', '录音文件不存在');
        setIsSaving(false);
        return;
      }

      // 读取音频并转为 base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];

        // 调用后端 ASR 接口
        const res = await fetch(`${API_BASE}/api/v1/asr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_data: base64 }),
        });

        const result = await res.json();

        if (result.success) {
          // 创建笔记
          const noteRes = await fetch(`${API_BASE}/api/v1/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `语音笔记 ${new Date().toLocaleString()}`,
              content: result.data.text || '（未识别到文字）',
            }),
          });

          const noteData = await noteRes.json();
          if (noteData.success) {
            Alert.alert('成功', '语音已识别并保存为笔记', [
              { text: '确定', onPress: () => router.back() },
            ]);
          } else {
            Alert.alert('错误', '保存笔记失败');
          }
        } else {
          Alert.alert('识别失败', result.error || '无法识别语音');
        }
        setIsSaving(false);
      };
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('错误', '保存失败');
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Screen>
      <View className="flex-1 bg-background items-center justify-center p-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-6 left-5 w-10 h-10 items-center justify-center"
        >
          <FontAwesome6 name="arrow-left" size={20} color="#4B5563" />
        </TouchableOpacity>

        <Text className="text-xl font-bold text-foreground mb-10">听音速记</Text>

        {/* 录音图标 */}
        <View className="w-40 h-40 rounded-full bg-red-100 items-center justify-center mb-10">
          <FontAwesome6 name="microphone" size={60} color={isRecording ? '#EF4444' : '#9CA3AF'} />
        </View>

        {/* 时长 */}
        <Text className="text-4xl font-bold text-foreground mb-10">
          {formatTime(duration)}
        </Text>

        {/* 状态 */}
        <Text className="text-base text-muted mb-10">
          {isRecording ? (isPaused ? '已暂停' : '正在录音...') : '点击开始录音'}
        </Text>

        {/* 控制按钮 */}
        <View className="flex-row gap-8">
          {/* 开始/继续 */}
          {!isRecording ? (
            <TouchableOpacity
              onPress={startRecording}
              className="w-16 h-16 rounded-full bg-indigo-500 items-center justify-center"
            >
              <FontAwesome6 name="play" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={pauseRecording}
              className="w-16 h-16 rounded-full bg-amber-500 items-center justify-center"
            >
              <FontAwesome6 name={isPaused ? 'play' : 'pause'} size={24} color="white" />
            </TouchableOpacity>
          )}

          {/* 结束 */}
          <TouchableOpacity
            onPress={stopAndSave}
            disabled={!isRecording || isSaving}
            className={`w-16 h-16 rounded-full items-center justify-center ${
              isRecording && !isSaving ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <FontAwesome6 name="stop" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
