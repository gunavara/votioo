import AsyncStorage from '@react-native-async-storage/async-storage';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  module: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;

  log(module: string, message: string, data?: any) {
    this.addLog('INFO', module, message, data);
  }

  warn(module: string, message: string, data?: any) {
    this.addLog('WARN', module, message, data);
  }

  error(module: string, message: string, data?: any) {
    this.addLog('ERROR', module, message, data);
  }

  debug(module: string, message: string, data?: any) {
    this.addLog('DEBUG', module, message, data);
  }

  private addLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', module: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only last 500 logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console
    const prefix = `[${level}] [${module}]`;
    if (level === 'ERROR') {
      console.error(prefix, message, data);
    } else if (level === 'WARN') {
      console.warn(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }

    // Save to AsyncStorage for persistence
    this.saveLogs();
  }

  private async saveLogs() {
    try {
      await AsyncStorage.setItem('debugLogs', JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save debug logs:', e);
    }
  }

  async getLogs(): Promise<LogEntry[]> {
    try {
      const stored = await AsyncStorage.getItem('debugLogs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to retrieve debug logs:', e);
      return [];
    }
  }

  async exportLogs(): Promise<string> {
    const allLogs = await this.getLogs();
    const formatted = allLogs
      .map(
        (log) =>
          `${log.timestamp} [${log.level}] [${log.module}] ${log.message}${
            log.data ? ' ' + JSON.stringify(log.data) : ''
          }`
      )
      .join('\n');
    return formatted;
  }

  async clearLogs() {
    try {
      await AsyncStorage.removeItem('debugLogs');
      this.logs = [];
    } catch (e) {
      console.error('Failed to clear debug logs:', e);
    }
  }
}

export const debugLogger = new DebugLogger();