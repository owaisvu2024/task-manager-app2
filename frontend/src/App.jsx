import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import ProgressBar from './components/ProgressBar';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Auth from './components/Auth';
import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [editingTask, setEditingTask] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);

  // Custom Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [onPromptSubmit, setOnPromptSubmit] = useState(null);

  // Axios defaults
  axios.defaults.baseURL = API_URL;
  axios.defaults.headers.common['Authorization'] = token;

  // Apply dark mode
  useEffect(() => {
    document.body.className = darkMode ? 'dark' : '';
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Socket notifications
  useEffect(() => {
    socket.on('notification', (data) => {
      setNotifications(prev => [data, ...prev]);
      showCustomAlert(`New Notification: ${data.message}`);
    });
    return () => socket.off('notification');
  }, []);

  // Custom alert
  const showCustomAlert = (message) => {
    setModalMessage(message);
    setShowModal(true);
  };

  // Custom prompt
  const showCustomPrompt = (message, onSubmit) => {
    setPromptMessage(message);
    setPromptInput('');
    setShowPromptModal(true);
    setOnPromptSubmit(() => onSubmit);
  };

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const personalTasks = (await axios.get('/api/tasks')).data;
      const sharedTasks = (await axios.get('/api/tasks/shared')).data;
      const uniqueTasks = Array.from(new Map([...personalTasks, ...sharedTasks].map(t => [t._id, t])).values());
      setTasks(uniqueTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error?.response);
      if (error?.response?.status === 401) handleLogout();
    }
  };

  // Filter tasks
  useEffect(() => {
    let filtered = [...tasks];
    if (searchQuery) filtered = filtered.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterStatus !== 'All') filtered = filtered.filter(t => t.status === filterStatus);
    setFilteredTasks(filtered);
  }, [tasks, searchQuery, filterStatus]);

  // Initial load
  useEffect(() => {
    if (isLoggedIn && !showAnalytics) fetchTasks();
  }, [isLoggedIn, showAnalytics]);

  // Handlers
  const handleTaskAdded = fetchTasks;

  const handleDeleteTask = async (id) => {
    try { await axios.delete(`/api/tasks/${id}`); fetchTasks(); }
    catch (e) { console.error('Error deleting task:', e?.response); }
  };

  const handleUpdateClick = setEditingTask;

  const handleUpdateTask = async (updatedTask) => {
    try { await axios.put(`/api/tasks/${updatedTask._id}`, updatedTask); setEditingTask(null); fetchTasks(); }
    catch (e) { console.error('Error updating task:', e?.response); }
  };

  const handleCancelUpdate = () => setEditingTask(null);

  const handleShareTask = (taskId) => {
    showCustomPrompt('Enter User ID to share with:', async (userId) => {
      if (!userId) return;
      try {
        await axios.put(`/api/tasks/${taskId}/share`, { userId });
        fetchTasks();
        showCustomAlert('Task shared successfully!');
      } catch (error) {
        console.error('Error sharing task:', error?.response?.data?.message);
        showCustomAlert(`Error sharing task: ${error?.response?.data?.message || 'Unknown error'}`);
      }
    });
  };

  const handleAuthSuccess = (newToken) => {
    setToken(newToken);
    setIsLoggedIn(true);
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = newToken;
    fetchTasks();
  };

  const handleLogout = () => {
    setToken(null);
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setTasks([]);
    setFilteredTasks([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#f39c12';
      case 'In Progress': return '#3498db';
      case 'Completed': return '#2ecc71';
      default: return '#bdc3c7';
    }
  };

  const bgColor = darkMode ? '#1f2a38' : '#f4f6f8';
  const textColor = darkMode ? '#ecf0f1' : '#2c3e50';
  const inputBg = darkMode ? '#34495e' : '#fff';
  const inputColor = darkMode ? '#ecf0f1' : '#2c3e50';
  const buttonBg = darkMode ? '#34495e' : '#2980b9';

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '40px', backgroundColor: bgColor, borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '10px', border: `2px solid ${darkMode ? '#34495e' : '#ddd'}` }}>
      <h1 style={{ textAlign: 'center', color: textColor, fontSize: '2.5rem', fontWeight: '700', textShadow: darkMode ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none' }}>
        Task Manager App
      </h1>

      {!isLoggedIn ? (
        <Auth onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          {/* Header buttons */}
          <div style={{ textAlign: 'right', marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '12px 25px', background: buttonBg, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button onClick={handleLogout} style={{ padding: '12px 25px', background: buttonBg, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
              Logout
            </button>

            <button onClick={() => setShowAnalytics(!showAnalytics)} style={{ padding: '12px 25px', background: buttonBg, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
              {showAnalytics ? 'View Tasks' : 'View Analytics'}
            </button>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div style={{ border: '2px solid #2ecc71', padding: '15px', marginBottom: '20px', backgroundColor: '#1abc9c', color: '#fff', borderRadius: '15px', animation: 'fadeIn 0.5s ease', boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)' }}>
              <h3 style={{ color: '#ecf0f1', margin: '0 0 10px 0' }}>Notifications:</h3>
              {notifications.map((notif, index) => (<p key={index} style={{ margin: '0', color: '#ecf0f1' }}>{notif.message}</p>))}
            </div>
          )}

          {showAnalytics ? (
            <AnalyticsDashboard />
          ) : (
            <>
              <ProgressBar tasks={filteredTasks} />

              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <input type="text" placeholder="Search tasks by title..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #34495e', backgroundColor: inputBg, color: inputColor }} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #34495e', backgroundColor: inputBg, color: inputColor, cursor: 'pointer' }}>
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {editingTask ? (
                <TaskForm taskToEdit={editingTask} onTaskUpdated={handleUpdateTask} onCancel={handleCancelUpdate} />
              ) : (
                <>
                  <TaskForm onTaskAdded={handleTaskAdded} />
                  <TaskList tasks={filteredTasks} onTaskDeleted={handleDeleteTask} onTaskUpdated={handleUpdateClick} onTaskShared={handleShareTask} getStatusColor={getStatusColor} onAttachmentsChanged={fetchTasks} />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#34495e', color: '#ecf0f1', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.1rem' }}>{modalMessage}</p>
            <button onClick={() => setShowModal(false)} style={{ marginTop: '20px', padding: '10px 20px', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      )}

      {showPromptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#34495e', color: '#ecf0f1', padding: '30px', borderRadius: '15px', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.1rem' }}>{promptMessage}</p>
            <input type="text" value={promptInput} onChange={e => setPromptInput(e.target.value)} style={{ margin: '20px 0', padding: '10px', borderRadius: '8px', border: '1px solid #7f8c8d', backgroundColor: '#2c3e50', color: '#ecf0f1' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={() => setShowPromptModal(false)} style={{ padding: '10px 20px', background: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { onPromptSubmit(promptInput); setShowPromptModal(false); }} style={{ padding: '10px 20px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Share</button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        body { transition: background 0.3s; }
        body.dark { background: #000; }
        `}
      </style>
    </div>
  );
}

export default App;
