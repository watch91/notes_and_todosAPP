import { Audio } from 'expo-av';
import { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import * as FileSystem from 'expo-file-system/legacy';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

export default function VoiceRecordScreen() {
  const router = useSafeRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeRef = useRef<NodeJS.Timeout | null>(null);

  // 申请录音权限
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (maxTimeRef.current) clearTimeout(maxTimeRef.current);
    };
  }, []);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 开始录音
  const startRecording = async () => {
    if (!hasPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请授予录音权限');
        return;
      }
      setHasPermission(true);
    }

    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // 10分钟后自动停止
      maxTimeRef.current = setTimeout(() => {
        stopRecording();
      }, 10 * 60 * 1000);
    } catch (error) {
      console.error('录音失败:', error);
      Alert.alert('错误', '录音启动失败');
    }
  };

  // 停止录音
  const stopRecording = async () => {
    if (!recordingRef.current) return;

    // 清理定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimeRef.current) {
      clearTimeout(maxTimeRef.current);
      maxTimeRef.current = null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        await processRecording(uri);
      }
    } catch (error) {
      console.error('停止录音失败:', error);
      Alert.alert('错误', '停止录音失败');
    }
  };

  // 处理录音 - 上传并识别
  const processRecording = async (uri: string) => {
    setIsProcessing(true);
    try {
      let base64Data: string;

      if (Platform.OS === 'web') {
        // Web 端使用 fetch 获取文件
        console.log('Web 端录音 URI:', uri);
        const response = await fetch(uri);
        const blob = await response.blob();
        console.log('Web 端 blob size:', blob.size);
        // 转换为 base64
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // 移除 data:audio/xxx;base64, 前缀
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // 移动端使用 expo-file-system
        base64Data = await (FileSystem as any).readAsStringAsync(uri, {
          encoding: (FileSystem as any).EncodingType.Base64,
        });
      }

      // 上传到后端进行语音识别
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Data }),
      });

      const result = await response.json();

      if (result.success && result.text) {
        // 跳转到新建笔记页面，预填入识别的内容
        router.replace('/note-edit', {
          content: result.text,
          title: '听音速记',
        });
      } else {
        Alert.alert('识别失败', result.error || '无法识别语音内容');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('处理录音失败:', error);
      Alert.alert('错误', '语音识别失败');
      setIsProcessing(false);
    }
  };

  // 取消录音
  const cancelRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      } catch (e) {
        // ignore
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimeRef.current) {
      clearTimeout(maxTimeRef.current);
      maxTimeRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    router.back();
  };

  return (
    <Screen>
      <View className="flex-1 bg-background p-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity onPress={cancelRecording}>
            <FontAwesome6 name="arrow-left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">听音速记</Text>
          <View className="w-6" />
        </View>

        {/* 录音界面 */}
        <View className="flex-1 items-center justify-center">
          {/* 录音时间显示 */}
          <Text className="text-5xl font-mono font-bold text-foreground mb-8">
            {formatTime(recordingTime)}
          </Text>

          {/* 录音状态指示 */}
          {isRecording && (
            <View className="flex-row items-center mb-8">
              <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
              <Text className="text-red-500 font-medium">录音中...</Text>
            </View>
          )}

          {isProcessing && (
            <View className="flex-row items-center mb-8">
              <ActivityIndicator size="small" color="#8B5CF6" className="mr-2" />
              <Text className="text-purple-500 font-medium">正在识别语音...</Text>
            </View>
          )}

          {/* 录音按钮 */}
          {!isProcessing && (
            <View className="flex-row items-center gap-8">
              {isRecording ? (
                <>
                  {/* 取消按钮 */}
                  <TouchableOpacity
                    onPress={cancelRecording}
                    className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center"
                  >
                    <FontAwesome6 name="xmark" size={24} color="#6B7280" />
                  </TouchableOpacity>

                  {/* 停止按钮 */}
                  <TouchableOpacity
                    onPress={stopRecording}
                    className="w-20 h-20 rounded-full bg-red-500 items-center justify-center"
                    style={{
                      shadowColor: '#EF4444',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <View className="w-8 h-8 rounded-sm bg-white" />
                  </TouchableOpacity>

                  {/* 占位 */}
                  <View className="w-16 h-16" />
                </>
              ) : (
                <TouchableOpacity
                  onPress={startRecording}
                  className="w-24 h-24 rounded-full bg-purple-500 items-center justify-center"
                  style={{
                    shadowColor: '#8B5CF6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <FontAwesome6 name="microphone" size={36} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 提示文字 */}
          {!isRecording && !isProcessing && (
            <Text className="text-muted text-center mt-8">
              点击麦克风开始录音{'\n'}最长可录制10分钟
            </Text>
          )}

          {isRecording && (
            <Text className="text-muted text-center mt-8">
              点击停止按钮结束录音
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
