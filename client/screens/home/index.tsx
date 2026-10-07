import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeNew from '@/components/home-new';
import HomeOld from '@/screens/home-old';

const PREF_KEY = 'home_ui_preference';

export default function HomeFacade() {
  const [variant, setVariant] = useState<'new' | 'old' | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      AsyncStorage.getItem(PREF_KEY).then((v) => {
        if (!cancelled) setVariant(v === 'old' ? 'old' : 'new');
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // 首次加载时短暂显示空白，避免 SSR/水合闪烁
  if (variant === null) return null;

  return variant === 'old' ? <HomeOld /> : <HomeNew />;
}