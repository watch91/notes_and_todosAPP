/**
 * WebSocket 实时更新 Hook
 * 用于接收后端推送的版本更新通知
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Alert, Platform, Linking } from 'react-native';

interface VersionUpdatePayload {
  currentVersion: string;
  newVersion: string;
  downloadUrl: string;
  isBeta: boolean;
}

interface WsMessage {
  type: string;
  payload: unknown;
}

export function useWebSocketUpdates() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectRef = useRef<() => void>(() => {});
  const [isConnected, setIsConnected] = useState(false);

  // 处理版本更新
  const handleVersionUpdate = useCallback((payload: VersionUpdatePayload) => {
    console.log('[WebSocket] 收到版本更新:', payload);
    
    const { newVersion, downloadUrl, isBeta } = payload;
    
    if (Platform.OS === 'web') {
      // Web 端使用 confirm 弹窗
      const message = isBeta 
        ? `发现新版本 v${newVersion}（内测版），是否更新？`
        : `发现新版本 v${newVersion}，是否更新？`;
      
      if (window.confirm(message)) {
        window.open(downloadUrl, '_blank');
      }
    } else {
      // 移动端使用 Alert 弹窗
      const title = isBeta ? '发现新版本（内测版）' : '发现新版本';
      const message = `v${newVersion} 已发布，是否立即下载更新？`;
      
      Alert.alert(title, message, [
        {
          text: '稍后再说',
          style: 'cancel',
        },
        {
          text: '立即更新',
          onPress: () => {
            Linking.openURL(downloadUrl);
          },
        },
      ]);
    }
  }, []);

  // 连接 WebSocket
  useEffect(() => {
    const connect = () => {
      // 构建 WebSocket URL
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';
      const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/updates';
      
      console.log('[WebSocket] 连接到:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] 连接成功');
        setIsConnected(true);
        
        // 启动心跳
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', payload: null }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          console.log('[WebSocket] 收到消息:', message);
          
          if (message.type === 'pong') {
            return;
          }
          
          if (message.type === 'version:update') {
            handleVersionUpdate(message.payload as VersionUpdatePayload);
          }
        } catch (error) {
          console.error('[WebSocket] 解析消息失败:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] 连接关闭');
        setIsConnected(false);
        
        // 清理心跳
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        
        // 自动重连
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] 尝试重连...');
          connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] 错误:', err);
      };
    };

    // 保存 connect 函数到 ref
    connectRef.current = connect;

    // 连接 WebSocket
    connect();
    
    // 清理函数
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [handleVersionUpdate]);

  return { isConnected };
}
