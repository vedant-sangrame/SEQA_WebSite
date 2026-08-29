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

// Socket.io Connection Handler
let activeUsersCount = 0;
io.on('connection', (socket) => {
  activeUsersCount++;
  console.log(`Client connected: ${socket.id} (Active Users: ${activeUsersCount})`);
  io.emit('users_count_updated', activeUsersCount);

  socket.on('disconnect', () => {
    activeUsersCount = Math.max(0, activeUsersCount - 1);
    console.log(`Client disconnected: ${socket.id} (Active Users: ${activeUsersCount})`);
    io.emit('users_count_updated', activeUsersCount);
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
