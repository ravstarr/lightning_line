require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/tickets',   require('./routes/tickets'));
app.use('/api/staff',     require('./routes/staff'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/queue',     require('./routes/queue'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Make io available inside route handlers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Socket] Client disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Lightning Line backend running on http://localhost:${PORT}`);
});
