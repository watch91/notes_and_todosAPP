/**
 * 统一的本地存储适配层
 *
 * 背景：@react-native-async-storage/async-storage 在鸿蒙NEXT (HarmonyOS NEXT) 等
 * 部分 RN 运行时上存在兼容性问题（原生模块未注册或读写不稳定），导致账号缓存等
 * 关键数据无法跨会话持久化。
 *
 * 解决方案：自动探测 AsyncStorage 是否可用；若不可用，自动降级到 expo-file-system
 * （基于平台原生文件 API，在鸿蒙NEXT 等平台上具有更好的兼容性）。
 *
 * 对外暴露与 AsyncStorage 一致的 setItem / getItem / removeItem 接口，调用方无感知。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const PROBE_KEY = '__storage_probe__';
const PROBE_VALUE = 'ok';

// 文件系统存储路径：documentDirectory 下的独立子目录，便于管理
const STORAGE_DIR_NAME = '_app_storage';

let probeResolved = false;
let useFileSystem = false;

function sanitizeKey(key: string): string {
  // 防止非法字符影响文件系统路径
  return encodeURIComponent(key).replace(/%/g, '_');
}

function getFilePath(key: string): string {
  // legacy 模块的 documentDirectory 类型不完整，使用 any 绕过
  const baseDir = (FileSystem as any).documentDirectory || '';
  return `${baseDir}${STORAGE_DIR_NAME}/${sanitizeKey(key)}.txt`;
}

async function ensureStorageDir(): Promise<void> {
  const baseDir = (FileSystem as any).documentDirectory;
  if (!baseDir) {
    throw new Error('documentDirectory 不可用，无法使用文件存储');
  }
  const dirPath = `${baseDir}${STORAGE_DIR_NAME}`;
  const dirInfo = await FileSystem.getInfoAsync(dirPath);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }
}

/**
 * 探测 AsyncStorage 是否在当前环境下可用。
 * 仅在首次调用时执行探测逻辑，结果会被缓存。
 */
async function detectBackend(): Promise<boolean> {
  if (probeResolved) return !useFileSystem;
  try {
    await AsyncStorage.setItem(PROBE_KEY, PROBE_VALUE);
    const result = await AsyncStorage.getItem(PROBE_KEY);
    await AsyncStorage.removeItem(PROBE_KEY);
    if (result === PROBE_VALUE) {
      useFileSystem = false;
    } else {
      useFileSystem = true;
    }
  } catch {
    useFileSystem = true;
  }
  probeResolved = true;
  return !useFileSystem;
}

/**
 * 强制重新探测存储后端（在写入失败时调用，回退到另一条路径）
 */
function forceUseFileSystem(): void {
  useFileSystem = true;
  probeResolved = true;
}

function forceUseAsyncStorage(): void {
  useFileSystem = false;
  probeResolved = true;
}

// ============ File System Backend ============

async function fileSetItem(key: string, value: string): Promise<void> {
  await ensureStorageDir();
  await FileSystem.writeAsStringAsync(getFilePath(key), value, {
    encoding: (FileSystem as any).EncodingType.UTF8,
  });
}

async function fileGetItem(key: string): Promise<string | null> {
  const path = getFilePath(key);
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  return await FileSystem.readAsStringAsync(path, {
    encoding: (FileSystem as any).EncodingType.UTF8,
  });
}

async function fileRemoveItem(key: string): Promise<void> {
  const path = getFilePath(key);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

// ============ Public API ============

export async function setItem(key: string, value: string): Promise<void> {
  const useFs = useFileSystem || !(await detectBackend());

  if (!useFs) {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch {
      // AsyncStorage 失败，降级到文件存储
      forceUseFileSystem();
    }
  }

  try {
    await fileSetItem(key, value);
  } catch (fileErr) {
    // 文件存储也失败，最后再尝试一次 AsyncStorage（可能刚才只是瞬时失败）
    try {
      await AsyncStorage.setItem(key, value);
      forceUseAsyncStorage();
    } catch (asyncErr) {
      throw new Error(
        `存储写入失败 (key: ${key}): file=${String(fileErr)}; async=${String(asyncErr)}`,
      );
    }
  }
}

export async function getItem(key: string): Promise<string | null> {
  const useFs = useFileSystem || !(await detectBackend());

  if (!useFs) {
    try {
      const result = await AsyncStorage.getItem(key);
      // getItem 在 key 不存在时返回 null，无法区分"不存在"与"原生模块失败"。
      // 这里依赖 setItem 的可用性判断，不再额外探测。
      return result;
    } catch {
      forceUseFileSystem();
    }
  }

  try {
    return await fileGetItem(key);
  } catch {
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  const useFs = useFileSystem || !(await detectBackend());

  if (!useFs) {
    try {
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      forceUseFileSystem();
    }
  }

  try {
    await fileRemoveItem(key);
  } catch {
    // 静默：removeItem 失败不影响功能
  }
}

/**
 * 主动探测并返回当前使用的存储后端（仅用于调试与日志）
 */
export async function getActiveBackend(): Promise<'async-storage' | 'file-system'> {
  await detectBackend();
  return useFileSystem ? 'file-system' : 'async-storage';
}

export const storage = {
  setItem,
  getItem,
  removeItem,
  getActiveBackend,
};

export default storage;