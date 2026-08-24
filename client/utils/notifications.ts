import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';

// 通知渠道 ID
const UPDATE_CHANNEL_ID = 'app-update';

/**
 * 初始化通知服务
 * 创建 Android 通知渠道
 */
export async function initNotificationService() {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: UPDATE_CHANNEL_ID,
      name: '应用更新',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      description: '接收应用更新通知',
    });
  }
}

/**
 * 发送应用更新通知
 * @param version 新版本号
 * @param downloadUrl 下载链接
 */
export async function sendUpdateNotification(version: string, downloadUrl?: string) {
  try {
    await notifee.displayNotification({
      title: '发现新版本',
      body: `新版本 v${version} 已发布，点击查看详情`,
      data: {
        type: 'update',
        version,
        downloadUrl: downloadUrl || '',
      },
      android: {
        channelId: UPDATE_CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
        // 设置为常驻通知（不可滑动清除）
        ongoing: false,
        // 自动取消（用户点击后自动清除）
        autoCancel: true,
      },
      ios: {
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });
  } catch (error) {
    console.error('发送通知失败:', error);
  }
}

/**
 * 请求通知权限
 * @returns 是否获得权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ 需要请求权限
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  } else if (Platform.OS === 'ios') {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  }
  return true;
}

/**
 * 获取通知权限状态
 */
export async function getNotificationPermissionStatus(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus >= 1;
}
