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
  private originalConsole: any = {};

  private constructor() {
    super();
    this.interceptConsole();
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

  private interceptConsole(): void {
    // Store original console methods
    this.originalConsole.log = console.log;
    this.originalConsole.info = console.info;
    this.originalConsole.warn = console.warn;
    this.originalConsole.error = console.error;

    // Override console methods to capture output
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.logFromConsole('info', args);
    };

    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.logFromConsole('info', args);
    };

    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.logFromConsole('warning', args);
    };

    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.logFromConsole('error', args);
    };
  }

  private logFromConsole(level: LogEntry['level'], args: any[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    // Determine category based on message content
    let category: LogEntry['category'] = 'system';
    
    if (message.includes('🛩️') || message.includes('Paper Plane') || message.includes('Mission') || 
        message.includes('🛑') || message.includes('taking off') || message.includes('completed')) {
      category = 'mission';
    } else if (message.includes('quota') || message.includes('replies') || message.includes('quotes') ||
               message.includes('Reply generated') || message.includes('Quote tweet generated') ||
               message.includes('Final quota results')) {
      category = 'quota';
    } else if (message.includes('engagement') || message.includes('Reply') || message.includes('Quote') ||
               message.includes('✅') || message.includes('❌') || message.includes('⚠️')) {
      category = 'engagement';
    } else if (message.includes('API') || message.includes('rate limit') || message.includes('request') ||
               message.includes('Authentication') || message.includes('Token')) {
      category = 'api';
    }

    // Extract mission ID if present in logs
    let missionId: string | undefined;
    const missionIdMatch = message.match(/Mission.*?([a-f0-9]{24})/i);
    if (missionIdMatch) {
      missionId = missionIdMatch[1];
    }

    // Don't log WebSocket connection messages to avoid loops
    if (message.includes('Admin client') || message.includes('WebSocket') || 
        message.includes('Log streaming') || message.includes('📱')) {
      return;
    }

    // Determine log level from emoji indicators
    let detectedLevel = level;
    if (message.includes('✅')) {
      detectedLevel = 'success';
    } else if (message.includes('❌')) {
      detectedLevel = 'error';
    } else if (message.includes('⚠️')) {
      detectedLevel = 'warning';
    }

    this.log({
      level: detectedLevel,
      category,
      message,
      missionId,
      metadata: { source: 'console', args: args.length > 1 ? args : undefined }
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
    
    // Use original console methods to avoid recursion
    this.originalConsole.log(`${timestamp} ${categoryIcon} ${levelIcon} ${entry.message}`);
    
    if (entry.metadata) {
      this.originalConsole.log('   📊 Metadata:', entry.metadata);
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
    // Restore original console methods
    if (this.originalConsole.log) {
      console.log = this.originalConsole.log;
      console.info = this.originalConsole.info;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
    }

    if (this.wss) {
      this.wss.close();
    }
    this.clients.clear();
  }
}

export default LogStreamService;