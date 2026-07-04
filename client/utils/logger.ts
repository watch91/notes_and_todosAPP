import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'app_logs';
const MAX_LOG_DAYS = 3; // 保留3天内的日志

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      const stored = await AsyncStorage.getItem(LOG_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
        // 清理过期日志
        this.cleanExpiredLogs();
      }
      this.initialized = true;
      this.info('系统', '日志系统初始化完成');
    } catch (e) {
      console.error('日志初始化失败:', e);
    }
  }

  private cleanExpiredLogs() {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - MAX_LOG_DAYS * 24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => new Date(log.timestamp) > threeDaysAgo);
  }

  private async save() {
    try {
      await AsyncStorage.setItem(LOG_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('日志保存失败:', e);
    }
  }

  private addLog(level: LogEntry['level'], module: string, message: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
    };
    this.logs.push(entry);
    // 限制日志数量，避免占用过多存储
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
    this.save();
  }

  info(module: string, message: string) {
    this.addLog('info', module, message);
  }

  warn(module: string, message: string) {
    this.addLog('warn', module, message);
  }

  error(module: string, error: Error | string) {
    const message = error instanceof Error ? `${error.message}\n${error.stack}` : error;
    this.addLog('error', module, message);
  }

  debug(module: string, message: string) {
    this.addLog('debug', module, message);
  }

  // 获取日志（用于问题反馈）
  async getLogs(days: number = MAX_LOG_DAYS): Promise<string> {
    await this.init();
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const filteredLogs = this.logs.filter(log => new Date(log.timestamp) > cutoff);
    
    return filteredLogs.map(log => {
      const time = new Date(log.timestamp).toLocaleString('zh-CN');
      const levelTag = log.level.toUpperCase().padEnd(5);
      return `[${time}] [${levelTag}] [${log.module}] ${log.message}`;
    }).join('\n');
  }

  // 清空日志
  async clear() {
    this.logs = [];
    await AsyncStorage.removeItem(LOG_KEY);
  }
}

export const logger = new Logger();

// 初始化日志系统
logger.init();
