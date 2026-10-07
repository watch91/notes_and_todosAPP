import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoteEditNew from '@/components/note-edit-new';
import NoteEditOld from '@/screens/note-edit-old';

const PREF_KEY = 'note_edit_ui_preference';

export default function NoteEditFacade() {
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

  if (variant === null) return null;

  return variant === 'old' ? <NoteEditOld /> : <NoteEditNew />;
}