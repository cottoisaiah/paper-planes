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
  IconButton
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
    repeatSchedule: '0 * * * *', // Hourly
    targetQueries: ''
  });

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
      repeatSchedule: '0 * * * *',
      targetQueries: ''
    });
    setDialogOpen(true);
  };

  const handleEditMission = (mission: Mission) => {
    setSelectedMission(mission);
    setFormData({
      objective: mission.objective,
      intentDescription: mission.intentDescription,
      repeatSchedule: mission.repeatSchedule,
      targetQueries: mission.targetQueries.join(', ')
    });
    setDialogOpen(true);
  };

  const handleSaveMission = async () => {
    try {
      const token = localStorage.getItem('token');
      const missionData = {
        ...formData,
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
    const scheduleMap: { [key: string]: string } = {
      '0 * * * *': 'Hourly',
      '0 0 * * *': 'Daily',
      '0 0 * * 0': 'Weekly',
      '0 0 1 * *': 'Monthly'
    };
    return scheduleMap[cron] || cron;
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
              <TextField
                fullWidth
                label="Schedule (Cron)"
                value={formData.repeatSchedule}
                onChange={(e) => setFormData({ ...formData, repeatSchedule: e.target.value })}
                placeholder="0 * * * * (hourly)"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Target Keywords"
                value={formData.targetQueries}
                onChange={(e) => setFormData({ ...formData, targetQueries: e.target.value })}
                placeholder="AI, machine learning, automation"
                sx={{ mb: 2 }}
              />
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
