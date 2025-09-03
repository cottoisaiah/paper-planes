import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { Add, Edit, Delete, PlayArrow, Stop } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Mission {
  _id: string;
  objective: string;
  intentDescription: string;
  repeatSchedule: string;
  targetQueries: string[];
  active: boolean;
  createdAt: string;
}

const Missions = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [formData, setFormData] = useState({
    objective: '',
    intentDescription: '',
    scheduleType: 'daily', // daily, weekly, hourly, custom
    scheduleTime: '12:00', // HH:MM format
    customCron: '',
    targetQueries: ''
  });

  // Helper function to convert schedule to cron
  const scheduleToCron = (type: string, time: string, customCron: string): string => {
    if (type === 'custom') return customCron;
    
    const [hours, minutes] = time.split(':').map(Number);
    
    switch (type) {
      case 'hourly':
        return `${minutes} * * * *`; // Every hour at specified minute
      case 'daily':
        return `${minutes} ${hours} * * *`; // Daily at specified time
      case 'weekly':
        return `${minutes} ${hours} * * 0`; // Weekly on Sunday at specified time
      case 'monthly':
        return `${minutes} ${hours} 1 * *`; // Monthly on 1st at specified time
      default:
        return `${minutes} ${hours} * * *`; // Default to daily
    }
  };

  // Helper function to convert cron to readable format
  const cronToReadable = (cron: string): string => {
    const scheduleMap: { [key: string]: string } = {
      '0 * * * *': 'Every hour',
      '0 0 * * *': 'Daily at midnight',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on 1st',
      '0 12 * * *': 'Daily at noon',
      '30 9 * * *': 'Daily at 9:30 AM',
      '0 18 * * *': 'Daily at 6:00 PM'
    };
    
    // Try to match common patterns
    if (scheduleMap[cron]) return scheduleMap[cron];
    
    // Parse cron to create readable format
    const parts = cron.split(' ');
    if (parts.length >= 5) {
      const minute = parts[0];
      const hour = parts[1];
      const day = parts[2];
      const dayOfWeek = parts[4];
      
      if (hour !== '*' && minute !== '*') {
        const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        if (dayOfWeek !== '*') {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return `Weekly on ${days[parseInt(dayOfWeek)]} at ${time}`;
        } else if (day === '1') {
          return `Monthly on 1st at ${time}`;
        } else {
          return `Daily at ${time}`;
        }
      }
    }
    
    return cron; // Fallback to showing cron syntax
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/missions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMissions(response.data);
    } catch (error) {
      toast.error('Failed to fetch missions');
    }
  };

  const handleCreateMission = () => {
    setSelectedMission(null);
    setFormData({
      objective: '',
      intentDescription: '',
      scheduleType: 'daily',
      scheduleTime: '12:00',
      customCron: '',
      targetQueries: ''
    });
    setDialogOpen(true);
  };

  const handleEditMission = (mission: Mission) => {
    setSelectedMission(mission);
    
    // Parse existing cron back to form data (best effort)
    let scheduleType = 'daily';
    let scheduleTime = '12:00';
    let customCron = mission.repeatSchedule;
    
    const parts = mission.repeatSchedule.split(' ');
    if (parts.length >= 5) {
      const minute = parts[0];
      const hour = parts[1];
      const dayOfWeek = parts[4];
      
      if (hour !== '*' && minute !== '*') {
        scheduleTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        if (dayOfWeek === '0') {
          scheduleType = 'weekly';
        } else if (parts[2] === '1') {
          scheduleType = 'monthly';
        } else {
          scheduleType = 'daily';
        }
      } else if (hour === '*') {
        scheduleType = 'hourly';
        scheduleTime = `00:${minute.padStart(2, '0')}`;
      } else {
        scheduleType = 'custom';
      }
    }
    
    setFormData({
      objective: mission.objective,
      intentDescription: mission.intentDescription,
      scheduleType,
      scheduleTime,
      customCron,
      targetQueries: mission.targetQueries.join(', ')
    });
    setDialogOpen(true);
  };

  const handleSaveMission = async () => {
    try {
      const token = localStorage.getItem('token');
      const missionData = {
        ...formData,
        repeatSchedule: scheduleToCron(formData.scheduleType, formData.scheduleTime, formData.customCron),
        targetQueries: formData.targetQueries.split(',').map(q => q.trim()).filter(q => q)
      };

      if (selectedMission) {
        await axios.put(`/api/missions/${selectedMission._id}`, missionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Mission updated successfully');
      } else {
        await axios.post('/api/missions', missionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Mission created successfully');
      }

      setDialogOpen(false);
      fetchMissions();
    } catch (error) {
      toast.error('Failed to save mission');
    }
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm('Are you sure you want to delete this mission?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/missions/${missionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Mission deleted successfully');
      fetchMissions();
    } catch (error) {
      toast.error('Failed to delete mission');
    }
  };

  const handleToggleMission = async (missionId: string, active: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = active ? `/api/bots/stop/${missionId}` : `/api/bots/start/${missionId}`;
      await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Mission ${active ? 'stopped' : 'started'} successfully`);
      fetchMissions();
    } catch (error) {
      toast.error(`Failed to ${active ? 'stop' : 'start'} mission`);
    }
  };

  const formatSchedule = (cron: string) => {
    return cronToReadable(cron);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ color: '#ffffff' }}>
          Mission Control
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateMission}
          sx={{ backgroundColor: '#1DA1F2' }}
        >
          Create Mission
        </Button>
      </Box>

      <Paper sx={{ backgroundColor: '#111111', border: '1px solid #333' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Objective</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Targets</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {missions.map((mission) => (
                <TableRow key={mission._id}>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {mission.objective}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatSchedule(mission.repeatSchedule)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {mission.targetQueries.join(', ')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={mission.active ? 'Active' : 'Inactive'}
                      color={mission.active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleMission(mission._id, mission.active)}
                        color={mission.active ? 'error' : 'success'}
                      >
                        {mission.active ? <Stop /> : <PlayArrow />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditMission(mission)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteMission(mission._id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Mission Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#111111', border: '1px solid #333' }
        }}
      >
        <DialogTitle>
          {selectedMission ? 'Edit Mission' : 'Create Mission'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mission Objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="e.g., Reply to posts about AI with product promotion"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Intent Description"
                value={formData.intentDescription}
                onChange={(e) => setFormData({ ...formData, intentDescription: e.target.value })}
                placeholder="Describe the bot's behavior and tone"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Schedule Type</InputLabel>
                <Select
                  value={formData.scheduleType}
                  label="Schedule Type"
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, scheduleType: e.target.value })}
                >
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly (Sunday)</MenuItem>
                  <MenuItem value="monthly">Monthly (1st)</MenuItem>
                  <MenuItem value="custom">Custom Cron</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              {formData.scheduleType === 'custom' ? (
                <TextField
                  fullWidth
                  label="Custom Cron Expression"
                  value={formData.customCron}
                  onChange={(e) => setFormData({ ...formData, customCron: e.target.value })}
                  placeholder="0 12 * * *"
                  sx={{ mb: 2 }}
                  helperText="Use cron syntax (minute hour day month dayOfWeek)"
                />
              ) : (
                <TextField
                  fullWidth
                  type="time"
                  label="Time"
                  value={formData.scheduleTime}
                  onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                  sx={{ mb: 2 }}
                  helperText={
                    formData.scheduleType === 'hourly' 
                      ? "Minute of each hour (e.g., 12:30 = 30 minutes past each hour)"
                      : `${formData.scheduleType === 'weekly' ? 'Sunday' : formData.scheduleType === 'monthly' ? '1st of month' : 'Every day'} at this time`
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Target Keywords"
                value={formData.targetQueries}
                onChange={(e) => setFormData({ ...formData, targetQueries: e.target.value })}
                placeholder="AI, machine learning, automation"
                sx={{ mb: 2 }}
                helperText="Comma-separated keywords to target"
              />
            </Grid>
            {/* Preview the generated cron */}
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">
                <strong>Schedule Preview:</strong> {cronToReadable(scheduleToCron(formData.scheduleType, formData.scheduleTime, formData.customCron))}
                <br />
                <strong>Cron Expression:</strong> {scheduleToCron(formData.scheduleType, formData.scheduleTime, formData.customCron)}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveMission} variant="contained">
            {selectedMission ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Missions;
