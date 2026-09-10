import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const faqs = [
  { q: '所有笔记和待办丢失了，新建笔记和待办也没反应，怎么办？', a: '在主界面下拉刷新，刷新完毕后即可恢复。' },
  { q: '界面为异常的黑色怎么办？', a: '在手机设置中，将手机颜色主题改为亮色即可。' },
  { q: '软件更新后，小秘密功能中保存的内容丢失了怎么办？', a: '更新软件时，请直接覆盖安装下载到的安装包，不要先卸载旧版软件再下载新软件，这样会导致小秘密中保存的内容丢失。已经丢失的内容无法找回，下次注意。' },
  { q: '这软件用起来好没意思呀，有没有什么彩蛋呢？', a: '去设置里把手机日期改为2026年7月10日试试吧！'},
  { q:'原来的账号ID/密码忘记了，无法登录，怎么办？', a:'请联系开发者进行处理'}
];

export default function HelpPage() {
  const router = useSafeRouter();

  return (
    <Screen>
      <View className="flex-1 bg-background">
        <View className="px-5 pt-4 pb-3 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <FontAwesome6 name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground ml-2">使用帮助</Text>
        </View>
        <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
          {faqs.map((faq, i) => (
            <View key={i} className="bg-white rounded-2xl p-4 mb-4" style={{ shadowColor: '#4F46E5', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                  <FontAwesome6 name="circle-question" size={14} color="#F59E0B" />
                </View>
                <Text className="flex-1 ml-3 font-medium text-foreground">{faq.q}</Text>
              </View>
              <View className="flex-row items-start mt-3">
                <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
                  <FontAwesome6 name="check" size={14} color="#10B981" />
                </View>
                <Text className="flex-1 ml-3 text-sm text-muted">{faq.a}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}
