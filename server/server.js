const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to app context so router can broadcast live changes
app.set('io', io);

// API Routes
app.use('/api', apiRoutes);

// Catch-all for any unhandled API endpoints (Returns clean JSON error instead of plain text 404)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
});

// Socket.io Connection Handler. Presence is isolated per workspace/board.
const workspaceSocketCounts = new Map();

function workspaceRoom(workspaceId) {
  return `workspace:${workspaceId}`;
}

function emitWorkspaceUserCount(workspaceId) {
  if (!workspaceId) return;
  io.to(workspaceRoom(workspaceId)).emit('users_count_updated', workspaceSocketCounts.get(workspaceId) || 0);
}

function leaveWorkspace(socket) {
  const workspaceId = socket.data.workspaceId;
  if (!workspaceId) return;
  socket.leave(workspaceRoom(workspaceId));
  const nextCount = Math.max(0, (workspaceSocketCounts.get(workspaceId) || 1) - 1);
  if (nextCount === 0) workspaceSocketCounts.delete(workspaceId);
  else workspaceSocketCounts.set(workspaceId, nextCount);
  socket.data.workspaceId = null;
  emitWorkspaceUserCount(workspaceId);
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join_workspace', (workspaceId) => {
    if (!workspaceId || typeof workspaceId !== 'string') return;
    if (socket.data.workspaceId === workspaceId) {
      emitWorkspaceUserCount(workspaceId);
      return;
    }
    leaveWorkspace(socket);
    socket.data.workspaceId = workspaceId;
    socket.join(workspaceRoom(workspaceId));
    workspaceSocketCounts.set(workspaceId, (workspaceSocketCounts.get(workspaceId) || 0) + 1);
    emitWorkspaceUserCount(workspaceId);
  });

  socket.on('leave_workspace', leaveWorkspace.bind(null, socket));

  socket.on('disconnect', () => {
    leaveWorkspace(socket);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Serve static assets in production mode (Render deployment)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback all non-API requests to index.html for SPA client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>SprintSync Server Running</title></head>
        <body style="font-family: system-ui, sans-serif; text-align: center; padding: 50px;">
          <h2>🚀 SprintSync API Server is running!</h2>
          <p>The client build is not available yet. Please run <code>npm run build</code> or start Vite dev server on port 3000.</p>
        </body>
        </html>
      `);
    }
  });
});

// Global Error Handler (Guarantees JSON output for any server exception)
app.use((err, req, res, next) => {
  console.error('Unhandled express error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SprintSync Board running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
