import { useEffect, useState, useCallback } from 'react';
import { Alert, Platform, Modal, View, Text, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { APP_VERSION } from '@/utils/version';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

const compareVersions = (a: string, b: string): boolean => {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum < bNum) return true;
    if (aNum > bNum) return false;
  }
  return false;
};

// 下载状态组件
function DownloadModal({ 
  visible, 
  progress, 
  status,
  onCancel,
  onInstall 
}: { 
  visible: boolean; 
  progress: number; 
  status: 'downloading' | 'completed' | 'error';
  onCancel: () => void;
  onInstall: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 items-center justify-center p-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm items-center">
          {status === 'downloading' && (
            <>
              <Text className="text-lg font-bold text-foreground mb-4">正在下载更新</Text>
              <View className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <View 
                  className="bg-indigo-500 h-3 rounded-full" 
                  style={{ width: `${progress}%` }} 
                />
              </View>
              <Text className="text-sm text-muted mb-4">{Math.round(progress)}%</Text>
              <TouchableOpacity
                className="bg-gray-200 rounded-xl px-6 py-2"
                onPress={onCancel}
              >
                <Text className="text-gray-600 font-medium">取消</Text>
              </TouchableOpacity>
            </>
          )}
          {status === 'completed' && (
            <>
              <Text className="text-lg font-bold text-foreground mb-4">下载完成</Text>
              <Text className="text-sm text-muted mb-6 text-center">是否立即安装更新？</Text>
              <View className="flex-row gap-3 w-full">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-3"
                  onPress={onCancel}
                >
                  <Text className="text-center text-gray-600 font-medium">稍后</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-indigo-500 rounded-xl py-3"
                  onPress={onInstall}
                >
                  <Text className="text-center text-white font-medium">安装</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {status === 'error' && (
            <>
              <Text className="text-lg font-bold text-foreground mb-4">下载失败</Text>
              <Text className="text-sm text-muted mb-6 text-center">请检查网络后重试</Text>
              <TouchableOpacity
                className="bg-indigo-500 rounded-xl px-6 py-3"
                onPress={onCancel}
              >
                <Text className="text-white font-medium">关闭</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function useAutoUpdate() {
  const [downloadVisible, setDownloadVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'downloading' | 'completed' | 'error'>('downloading');
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [downloadResumable, setDownloadResumable] = useState<any>(null);

  const handleInstall = useCallback(async () => {
    if (!downloadedUri || Platform.OS !== 'android') return;
    
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: downloadedUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
    } catch (e) {
      console.error('Install error:', e);
      Alert.alert('安装失败', '请手动安装下载的APK文件');
    }
  }, [downloadedUri]);

  const handleCancel = useCallback(() => {
    if (downloadResumable) {
      downloadResumable.pauseAsync();
    }
    setDownloadVisible(false);
    setDownloadProgress(0);
    setDownloadedUri(null);
    setDownloadResumable(null);
  }, [downloadResumable]);

  const startDownload = useCallback(async (url: string) => {
    setDownloadVisible(true);
    setDownloadStatus('downloading');
    setDownloadProgress(0);

    const fileUri = (FileSystem as any).documentDirectory + 'update.apk';

    try {
      const download = (FileSystem as any).createDownloadResumable(
        url,
        fileUri,
        {},
        (downloadProgress: any) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress * 100);
        }
      );

      setDownloadResumable(download);
      const result = await download.downloadAsync();

      if (result) {
        setDownloadedUri(result.uri);
        setDownloadStatus('completed');
      } else {
        setDownloadStatus('error');
      }
    } catch (e) {
      console.error('Download error:', e);
      setDownloadStatus('error');
    }
  }, []);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/version`);
        const data = await res.json();
        if (data.new_version && compareVersions(APP_VERSION, data.new_version)) {
          Alert.alert(
            '发现新版本',
            `当前版本 ${APP_VERSION}，最新版本 ${data.new_version}，是否立即更新？`,
            [
              { text: '稍后', style: 'cancel' },
              { text: '立即更新', onPress: () => {
                if (data.download_url) {
                  startDownload(data.download_url);
                }
              }}
            ]
          );
        }
      } catch (e) {
        // 静默处理
      }
    };
    checkVersion();
  }, [startDownload]);

  return {
    DownloadModal: () => (
      <DownloadModal
        visible={downloadVisible}
        progress={downloadProgress}
        status={downloadStatus}
        onCancel={handleCancel}
        onInstall={handleInstall}
      />
    ),
  };
}
