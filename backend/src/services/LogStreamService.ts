import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: 'mission' | 'quota' | 'engagement' | 'api' | 'system';
  message: string;
  missionId?: string;
  userId?: string;
  metadata?: any;
}

class LogStreamService extends EventEmitter {
  private static instance: LogStreamService;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    super();
  }

  static getInstance(): LogStreamService {
    if (!LogStreamService.instance) {
      LogStreamService.instance = new LogStreamService();
    }
    return LogStreamService.instance;
  }

  initializeWebSocketServer(port: number = 3002): void {
    this.wss = new WebSocketServer({ port });
    console.log(`📡 Log streaming WebSocket server started on port ${port}`);

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📱 Admin client connected to log stream');
      this.clients.add(ws);

      // Send recent log history to new clients
      this.sendLogHistory(ws);

      ws.on('close', () => {
        console.log('📱 Admin client disconnected from log stream');
        this.clients.delete(ws);
      });

      ws.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private sendLogHistory(ws: WebSocket): void {
    const recentLogs = this.logHistory.slice(-50); // Send last 50 logs
    if (recentLogs.length > 0) {
      ws.send(JSON.stringify({
        type: 'history',
        logs: recentLogs
      }));
    }
  }

  log(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    // Add to history
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Broadcast to all connected clients
    this.broadcast(logEntry);

    // Also log to console with formatting
    this.logToConsole(logEntry);
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const categoryIcon = this.getCategoryIcon(entry.category);
    const levelIcon = this.getLevelIcon(entry.level);
    
    console.log(`${timestamp} ${categoryIcon} ${levelIcon} ${entry.message}`);
    
    if (entry.metadata) {
      console.log('   📊 Metadata:', entry.metadata);
    }
  }

  private getCategoryIcon(category: string): string {
    const icons = {
      mission: '🛩️',
      quota: '📊',
      engagement: '💬',
      api: '🔌',
      system: '⚙️'
    };
    return icons[category as keyof typeof icons] || '📋';
  }

  private getLevelIcon(level: string): string {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };
    return icons[level as keyof typeof icons] || 'ℹ️';
  }

  private broadcast(entry: LogEntry): void {
    const message = JSON.stringify({
      type: 'log',
      entry
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        this.clients.delete(client);
      }
    });
  }

  // Convenience methods for different log levels and categories
  logMission(level: LogEntry['level'], message: string, missionId?: string, metadata?: any): void {
    this.log({
      level,
      category: 'mission',
      message,
      missionId,
      metadata
    });
  }

  logQuota(level: LogEntry['level'], message: string, missionId?: string, metadata?: any): void {
    this.log({
      level,
      category: 'quota', 
      message,
      missionId,
      metadata
    });
  }

  logEngagement(level: LogEntry['level'], message: string, missionId?: string, metadata?: any): void {
    this.log({
      level,
      category: 'engagement',
      message, 
      missionId,
      metadata
    });
  }

  logApi(level: LogEntry['level'], message: string, metadata?: any): void {
    this.log({
      level,
      category: 'api',
      message,
      metadata
    });
  }

  logSystem(level: LogEntry['level'], message: string, metadata?: any): void {
    this.log({
      level,
      category: 'system',
      message,
      metadata
    });
  }

  close(): void {
    if (this.wss) {
      this.wss.close();
    }
    this.clients.clear();
  }
}

export default LogStreamService;