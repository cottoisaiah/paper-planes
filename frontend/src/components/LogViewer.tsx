import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Badge
} from '@mui/material';
import { format } from 'date-fns';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: 'mission' | 'quota' | 'engagement' | 'api' | 'system';
  message: string;
  missionId?: string;
  userId?: string;
  metadata?: any;
}

interface LogViewerProps {
  onClose?: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filters, setFilters] = useState({
    level: 'all',
    category: 'all',
    search: ''
  });
  const [autoScroll, setAutoScroll] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to WebSocket
    const connectWebSocket = () => {
      // Use proxied WebSocket endpoint through nginx
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Connected to log stream');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'history') {
          setLogs(data.logs);
        } else if (data.type === 'log') {
          setLogs(prev => [...prev, data.entry]);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Disconnected from log stream');
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs based on current filters
  useEffect(() => {
    let filtered = logs;

    if (filters.level !== 'all') {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.missionId?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  const getLevelColor = (level: string) => {
    const colors = {
      info: 'info',
      success: 'success',
      warning: 'warning',
      error: 'error'
    };
    return colors[level as keyof typeof colors] || 'default';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      mission: 'primary',
      quota: 'secondary',
      engagement: 'success',
      api: 'info',
      system: 'default'
    };
    return colors[category as keyof typeof colors] || 'default';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      mission: '🛩️',
      quota: '📊',
      engagement: '💬',
      api: '🔌',
      system: '⚙️'
    };
    return icons[category as keyof typeof icons] || '📋';
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logsText = filteredLogs.map(log => 
      `${log.timestamp} [${log.level.toUpperCase()}] [${log.category.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paper-planes-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: '#111111', border: '1px solid #333', height: '80vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">Live Logs</Typography>
          <Badge 
            color={isConnected ? 'success' : 'error'} 
            variant="dot"
          >
            <Chip 
              label={isConnected ? 'Connected' : 'Disconnected'} 
              color={isConnected ? 'success' : 'error'}
              size="small"
            />
          </Badge>
          <Chip 
            label={`${filteredLogs.length} logs`} 
            color="primary" 
            size="small"
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            onClick={() => setAutoScroll(!autoScroll)}
            variant={autoScroll ? 'contained' : 'outlined'}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Button>
          <Button size="small" onClick={exportLogs}>Export</Button>
          <Button size="small" onClick={clearLogs} color="warning">Clear</Button>
          {onClose && <Button size="small" onClick={onClose}>Close</Button>}
        </Box>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </Grid>
        
        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Level</InputLabel>
            <Select
              value={filters.level}
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <MenuItem value="all">All Categories</MenuItem>
              <MenuItem value="mission">Mission</MenuItem>
              <MenuItem value="quota">Quota</MenuItem>
              <MenuItem value="engagement">Engagement</MenuItem>
              <MenuItem value="api">API</MenuItem>
              <MenuItem value="system">System</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Logs Display */}
      <Box 
        sx={{ 
          height: 'calc(100% - 140px)', 
          overflow: 'auto',
          backgroundColor: '#000000',
          border: '1px solid #333',
          borderRadius: 1,
          p: 1
        }}
      >
        <List dense>
          {filteredLogs.map((log, index) => (
            <React.Fragment key={index}>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ color: '#888', minWidth: '60px' }}>
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </Typography>
                      
                      <Chip
                        label={log.level}
                        color={getLevelColor(log.level) as any}
                        size="small"
                        sx={{ minWidth: '70px', fontSize: '0.7rem' }}
                      />
                      
                      <Chip
                        label={`${getCategoryIcon(log.category)} ${log.category}`}
                        color={getCategoryColor(log.category) as any}
                        size="small"
                        sx={{ fontSize: '0.7rem' }}
                      />
                      
                      {log.missionId && (
                        <Chip
                          label={`Mission: ${log.missionId.slice(-6)}`}
                          variant="outlined"
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontFamily: 'monospace' }}>
                        {log.message}
                      </Typography>
                      {log.metadata && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#888', 
                            display: 'block', 
                            mt: 0.5,
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {JSON.stringify(log.metadata, null, 2)}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              {index < filteredLogs.length - 1 && <Divider sx={{ borderColor: '#333' }} />}
            </React.Fragment>
          ))}
        </List>
        <div ref={logsEndRef} />
      </Box>
    </Paper>
  );
};

export default LogViewer;