require('dotenv').config();
const cluster = require('cluster');
const os = require('os');

const CLUSTER_MODE = process.env.CLUSTER_MODE === 'true';
const WORKERS = parseInt(process.env.WORKERS) || os.cpus().length;

// Primary process — fork workers and handle restarts
if (CLUSTER_MODE && cluster.isPrimary) {
  console.log(`[Cluster] Primary ${process.pid} spawning ${WORKERS} workers`);

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Cluster] Worker ${worker.process.pid} died (${signal || code}) — restarting`);
    cluster.fork();
  });

} else {
  startServer();
}

async function startServer() {
  const express = require('express');
  const http = require('http');
  const { Server } = require('socket.io');
  const { createAdapter } = require('@socket.io/redis-adapter');
  const Redis = require('ioredis');
  const cors = require('cors');

  const app = express();
  const server = http.createServer(app);

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  const io = new Server(server, {
    cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
  });

  // Redis adapter — broadcasts Socket.io events across all cluster workers
  const pubClient = new Redis(REDIS_URL, { lazyConnect: true });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]).catch((err) => {
    console.error('[Socket.io Redis adapter] Could not connect:', err.message);
  });
  io.adapter(createAdapter(pubClient, subClient));

  app.use(cors({ origin: FRONTEND_URL }));
  app.use(express.json());

  const { router: staffRouter, restoreDelayTimers, restoreCalledTimers } = require('./routes/staff');

  app.use('/api/auth',      require('./routes/auth'));
  app.use('/api/customers', require('./routes/customers'));
  app.use('/api/tickets',   require('./routes/tickets'));
  app.use('/api/staff',     staffRouter);
  app.use('/api/admin',     require('./routes/admin'));
  app.use('/api/queue',     require('./routes/queue'));

  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', pid: process.pid, cluster: CLUSTER_MODE })
  );

  app.set('io', io);

  io.on('connection', (socket) => {
    const label = CLUSTER_MODE ? ` (worker ${process.pid})` : '';
    console.log(`[Socket] Client connected: ${socket.id}${label}`);
    socket.on('disconnect', () =>
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    );
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    const label = CLUSTER_MODE ? `Worker ${process.pid}` : 'Server';
    console.log(`[${label}] Lightning Line backend running on port ${PORT}`);
    restoreDelayTimers().catch(console.error);
    restoreCalledTimers(io).catch(console.error);
  });
}
