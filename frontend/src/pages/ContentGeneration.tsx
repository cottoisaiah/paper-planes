import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  AutoAwesome,
  ContentCopy,
  Delete,
  Add,
  Twitter,
  Psychology,
  Close,
  CheckCircle
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axios from 'axios';

interface ContextItem {
  _id: string;
  data: string;
  type: string;
  filename?: string;
  createdAt: string;
}

interface GeneratedContent {
  content: string;
  tokensUsed: number;
  model: string;
  contextUsed: boolean;
}

const ContentGeneration = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [prompt, setPrompt] = useState('');
  const [useContext, setUseContext] = useState(false);
  const [selectedContext, setSelectedContext] = useState('');
  const [style, setStyle] = useState('');
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [newContextData, setNewContextData] = useState('');
  const [newContextType, setNewContextType] = useState('text');
  const [copiedIndex, setCopiedIndex] = useState(-1);

  const styles = [
    { value: '', label: 'Auto Style' },
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'humorous', label: 'Humorous' },
    { value: 'informative', label: 'Informative' },
    { value: 'inspirational', label: 'Inspirational' }
  ];

  const fetchContexts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/context', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContexts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching contexts:', error);
    }
  };

  const generateContent = async (variations = false) => {
    if (!prompt.trim()) return;
    
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');
      
      const endpoint = variations ? '/api/analytics/generate-variations' : '/api/analytics/generate-content';
      const payload = {
        prompt: prompt.trim(),
        useContext,
        contextId: selectedContext || undefined,
        style: style || undefined,
        ...(variations && { count: 3 })
      };

      const response = await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        if (variations) {
          setGeneratedContent(response.data.data);
        } else {
          setGeneratedContent([response.data.data]);
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setGenerating(false);
    }
  };

  const addContext = async () => {
    if (!newContextData.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/analytics/context', {
        data: newContextData.trim(),
        type: newContextType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewContextData('');
      setShowContextDialog(false);
      fetchContexts();
    } catch (error) {
      console.error('Error adding context:', error);
    }
  };

  const deleteContext = async (contextId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/analytics/context/${contextId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchContexts();
    } catch (error) {
      console.error('Error deleting context:', error);
    }
  };

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(-1), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchContexts();
    }
  }, [user]);

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" sx={{ color: '#ffffff' }}>
          Please log in to access content generation
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, px: { xs: 1, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          sx={{ 
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Psychology />
          AI Content Generation
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => setShowContextDialog(true)}
          sx={{
            borderColor: '#1DA1F2',
            color: '#1DA1F2',
            fontSize: isMobile ? '0.8rem' : '1rem'
          }}
        >
          Add Context
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Generation Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#111111', border: '1px solid #333' }}>
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesome />
              Generate Content
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Content Prompt"
              placeholder="Describe what kind of tweet you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#1DA1F2' },
                  '&.Mui-focused fieldset': { borderColor: '#1DA1F2' },
                },
                '& .MuiInputLabel-root': { color: '#8899a6' },
              }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel sx={{ color: '#8899a6' }}>Style</InputLabel>
              <Select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                sx={{
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1DA1F2' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1DA1F2' },
                  '& .MuiSvgIcon-root': { color: '#8899a6' }
                }}
              >
                {styles.map((styleOption) => (
                  <MenuItem key={styleOption.value} value={styleOption.value}>
                    {styleOption.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={useContext}
                  onChange={(e) => setUseContext(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#1DA1F2',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#1DA1F2',
                    },
                  }}
                />
              }
              label={<Typography sx={{ color: '#ffffff' }}>Use Context</Typography>}
            />

            {useContext && (
              <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                <InputLabel sx={{ color: '#8899a6' }}>Select Context</InputLabel>
                <Select
                  value={selectedContext}
                  onChange={(e) => setSelectedContext(e.target.value)}
                  sx={{
                    color: '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1DA1F2' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1DA1F2' },
                    '& .MuiSvgIcon-root': { color: '#8899a6' }
                  }}
                >
                  {contexts.map((context) => (
                    <MenuItem key={context._id} value={context._id}>
                      {context.filename || `${context.type} context`} - {new Date(context.createdAt).toLocaleDateString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
              <Button
                fullWidth={isMobile}
                variant="contained"
                onClick={() => generateContent(false)}
                disabled={generating || !prompt.trim()}
                sx={{ backgroundColor: '#1DA1F2', flexGrow: 1 }}
              >
                {generating ? <CircularProgress size={20} /> : 'Generate'}
              </Button>
              
              <Button
                fullWidth={isMobile}
                variant="outlined"
                onClick={() => generateContent(true)}
                disabled={generating || !prompt.trim()}
                sx={{ borderColor: '#1DA1F2', color: '#1DA1F2' }}
              >
                3 Variations
              </Button>
            </Box>
          </Paper>

          {/* Context Items */}
          {contexts.length > 0 && (
            <Paper sx={{ p: 2, mt: 2, backgroundColor: '#111111', border: '1px solid #333' }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Available Context ({contexts.length})
              </Typography>
              
              <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {contexts.map((context) => (
                  <Box key={context._id} sx={{ mb: 1, p: 1, backgroundColor: '#1a1a1a', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#8899a6' }}>
                        {context.filename || `${context.type} context`}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => deleteContext(context._id)}
                        sx={{ color: '#f44336' }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                      {context.data.substring(0, 100)}...
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Grid>

        {/* Generated Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, backgroundColor: '#111111', border: '1px solid #333', minHeight: 400 }}>
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Twitter />
              Generated Content
            </Typography>
            
            {generatedContent.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AutoAwesome sx={{ fontSize: 64, color: '#333', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#8899a6', mb: 1 }}>
                  No Content Generated Yet
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Enter a prompt and click Generate to create AI-powered tweets
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {generatedContent.map((content, index) => (
                  <Grid item xs={12} key={index}>
                    <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body1" sx={{ color: '#ffffff', mb: 1, lineHeight: 1.5 }}>
                              {content.content}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip 
                                label={`${content.model}`} 
                                size="small" 
                                sx={{ backgroundColor: '#1DA1F2', color: '#ffffff' }} 
                              />
                              <Chip 
                                label={`${content.tokensUsed} tokens`} 
                                size="small" 
                                sx={{ backgroundColor: '#333', color: '#8899a6' }} 
                              />
                              {content.contextUsed && (
                                <Chip 
                                  label="Context Used" 
                                  size="small" 
                                  sx={{ backgroundColor: '#4CAF50', color: '#ffffff' }} 
                                />
                              )}
                              <Chip 
                                label={`${content.content.length} chars`} 
                                size="small" 
                                sx={{ backgroundColor: '#333', color: '#8899a6' }} 
                              />
                            </Box>
                          </Box>
                          
                          <Tooltip title={copiedIndex === index ? "Copied!" : "Copy to clipboard"}>
                            <IconButton 
                              onClick={() => copyToClipboard(content.content, index)}
                              sx={{ 
                                color: copiedIndex === index ? '#4CAF50' : '#1DA1F2',
                                ml: 1 
                              }}
                            >
                              {copiedIndex === index ? <CheckCircle /> : <ContentCopy />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                        
                        {content.content.length > 280 && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            Tweet is {content.content.length} characters (over 280 limit)
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Add Context Dialog */}
      <Dialog 
        open={showContextDialog} 
        onClose={() => setShowContextDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#111111',
            border: '1px solid #333'
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Context
          <IconButton onClick={() => setShowContextDialog(false)} sx={{ color: '#8899a6' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel sx={{ color: '#8899a6' }}>Context Type</InputLabel>
            <Select
              value={newContextType}
              onChange={(e) => setNewContextType(e.target.value)}
              sx={{
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1DA1F2' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1DA1F2' },
                '& .MuiSvgIcon-root': { color: '#8899a6' }
              }}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="file">File Content</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Context Data"
            placeholder="Enter your context information here..."
            value={newContextData}
            onChange={(e) => setNewContextData(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: '#333' },
                '&:hover fieldset': { borderColor: '#1DA1F2' },
                '&.Mui-focused fieldset': { borderColor: '#1DA1F2' },
              },
              '& .MuiInputLabel-root': { color: '#8899a6' },
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setShowContextDialog(false)}
            sx={{ color: '#8899a6' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={addContext}
            variant="contained"
            disabled={!newContextData.trim()}
            sx={{ backgroundColor: '#1DA1F2' }}
          >
            Add Context
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ContentGeneration;
