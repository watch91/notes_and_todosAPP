import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventSource from 'react-native-sse';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { apiBase } from '@/utils';
import { setAiAssistantResult } from '@/utils/ai-assistant-result';

const API_BASE = apiBase;

/**
 * 从 AI 输出文本中提取实际内容（处理 JSON 包裹、markdown 代码块等）
 */
function extractOutputFromText(text: string): string {
  // 1) 尝试 JSON 解析
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.output === 'string') return obj.output;
  } catch {
    // ignore
  }
  // 2) 去除 markdown 代码块再试一次
  const trimmed = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj.output === 'string') return obj.output;
  } catch {
    // ignore
  }
  // 3) 正则提取
  const match = text.match(/\{\s*output\s*:\s*"([\s\S]*?)"\s*\}/);
  if (match) {
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }
  // 4) 兜底：返回原文
  return text;
}

export default function AiAssistantScreen() {
  const router = useSafeRouter();
  const { currentContent } = useSafeSearchParams<{ currentContent: string }>();
  const insets = useSafeAreaInsets();

  const [instruction, setInstruction] = useState('');
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(false);

  const sseRef = useRef<EventSource | null>(null);
  const closedByDoneRef = useRef(false);

  // 组件卸载时关闭 SSE 连接
  useEffect(() => {
    return () => {
      sseRef.current?.close();
      sseRef.current = null;
    };
  }, []);

  const handleSend = () => {
    const text = instruction.trim();
    if (!text) {
      Alert.alert('提示', '请输入你的写作需求');
      return;
    }
    if (loading) return;

    // 关闭旧连接
    sseRef.current?.close();
    sseRef.current = null;
    closedByDoneRef.current = false;

    setLoading(true);
    setStreamText('');

    /**
     * 服务端文件：server/src/routes/ai.ts
     * 接口：POST /api/v1/notes/ai-assistant/stream
     * Body 参数：currentContent: string, userInstruction: string
     */
    const es = new EventSource(`${API_BASE}/api/v1/notes/ai-assistant/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentContent: currentContent || '', userInstruction: text }),
      pollingInterval: 0,
    });
    sseRef.current = es;

    es.addEventListener('message', (event: any) => {
      const line: string = event?.data ?? '';
      if (!line) return;
      if (line === '[DONE]') {
        closedByDoneRef.current = true;
        es.close();
        sseRef.current = null;
        setStreamText((prev) => extractOutputFromText(prev));
        setLoading(false);
        return;
      }
      if (line.startsWith('__END__')) {
        setStreamText(line.slice('__END__'.length));
      } else if (line.startsWith('__ERROR__')) {
        setStreamText((prev) => prev + `\n[错误] ${line.slice('__ERROR__'.length)}`);
      } else {
        setStreamText((prev) => prev + line);
      }
    });

    es.addEventListener('error', (event: any) => {
      if (closedByDoneRef.current) return;
      const status = event?.status;
      const message = event?.message || `请求失败: ${status ?? '网络错误'}`;
      es.close();
      sseRef.current = null;
      setLoading(false);
      Alert.alert('错误', message);
    });
  };

  const handleApply = () => {
    const text = extractOutputFromText(streamText);
    if (!text) {
      Alert.alert('提示', '暂无内容可应用');
      return;
    }
    // 暂存结果，返回笔记编辑页后由 useFocusEffect 消费
    setAiAssistantResult(text);
    router.back();
  };

  const handleBack = () => {
    if (loading) {
      Alert.alert('提示', 'AI 正在生成中，请等待完成后再返回', [
        { text: '继续等待' },
        {
          text: '强制返回',
          style: 'destructive',
          onPress: () => {
            sseRef.current?.close();
            sseRef.current = null;
            setLoading(false);
            router.back();
          },
        },
      ]);
      return;
    }
    router.back();
  };

  const hasResult = streamText.trim().length > 0;

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-gray-100">
          <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
            <FontAwesome6 name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-2">
              <FontAwesome6 name="wand-magic-sparkles" size={14} color="#8B5CF6" />
            </View>
            <Text className="text-lg font-bold text-foreground">AI 写作助手</Text>
          </View>
          <View className="w-10" />
        </View>

        {/* 内容区 */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 提示语 */}
          <View className="bg-purple-50 rounded-2xl px-4 py-3 mb-4">
            <Text className="text-sm text-purple-700 font-medium">撰写？修改？润色？由你决定</Text>
            <Text className="text-xs text-purple-500 mt-1">
              基于当前笔记内容，告诉我你的需求，AI 会流式输出修改后的完整文章
            </Text>
          </View>

          {/* 输入区 */}
          <View
            className="bg-gray-100 rounded-2xl px-3 py-2 flex-row items-end mb-4"
            style={{ minHeight: 56 }}
          >
            <TextInput
              value={instruction}
              onChangeText={setInstruction}
              placeholder="例如：把第三段润色得更生动；帮我续写一段结尾…"
              placeholderTextColor="#9CA3AF"
              multiline
              className="flex-1 text-sm text-foreground"
              style={{ outline: 'none', minHeight: 40, maxHeight: 120 }}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={loading || !instruction.trim()}
              className="ml-2 mb-1 px-3 py-2 rounded-full"
              style={{
                backgroundColor: loading || !instruction.trim() ? '#C4B5FD' : '#8B5CF6',
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <FontAwesome6 name="paper-plane" size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* 结果展示区 */}
          <View
            className="bg-white rounded-2xl border border-gray-200 px-4 py-3"
            style={{ minHeight: 200 }}
          >
            {loading && !streamText ? (
              <View className="items-center justify-center py-12">
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text className="text-xs text-gray-400 mt-2">AI 正在思考…</Text>
              </View>
            ) : streamText ? (
              <Text className="text-sm text-foreground leading-6" selectable>
                {streamText}
              </Text>
            ) : (
              <View className="items-center justify-center py-12">
                <FontAwesome6 name="feather-pointed" size={22} color="#D1D5DB" />
                <Text className="text-xs text-gray-400 mt-2">AI 修改后的内容将显示在这里</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 底部按钮 */}
        {hasResult && !loading && (
          <View
            className="px-5 pt-3 pb-3 border-t border-gray-100 bg-white"
            style={{ paddingBottom: 12 + insets.bottom }}
          >
            <TouchableOpacity
              onPress={handleApply}
              className="py-3 rounded-full items-center"
              style={{ backgroundColor: '#8B5CF6' }}
            >
              <Text className="text-sm font-medium text-white">应用到笔记</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
