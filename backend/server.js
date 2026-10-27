const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const seedUsers = require('./utils/seedUsers');
const seedMembers = require('./utils/seedMembers');

// Load environment variables from .env file
dotenv.config({ path: require('path').resolve(__dirname, '.env') });

// Initialize Express app
const app = express();

// Connect to MongoDB Atlas and auto-seed initial accounts (members left clean for manual real-world entry)
connectDB().then(async () => {
  await seedUsers();
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl) or any localhost port
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get('/', (req, res) => {
  res.json({
    project: 'Chitti Collection Management System API',
    status: 'Running',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Health check endpoint - used to verify backend and MongoDB Atlas connectivity
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  const isConnected = dbState === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'healthy' : 'degraded',
    server: 'Running',
    timestamp: new Date().toISOString(),
    database: {
      status: states[dbState] || 'Unknown',
      connected: isConnected,
      host: isConnected ? mongoose.connection.host : null,
      name: isConnected ? mongoose.connection.name : null
    }
  });
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const reminderRoutes = require('./routes/reminderRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/reminders', reminderRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`🚀 Chitti Backend Server is running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🔐 Auth Endpoints: http://localhost:${PORT}/api/auth/login`);
  console.log(`👥 Member Endpoints: http://localhost:${PORT}/api/members`);
  console.log(`📅 Collection Endpoints: http://localhost:${PORT}/api/collections`);
  console.log(`💰 Payment Endpoints: http://localhost:${PORT}/api/payments`);
  console.log(`📜 Activity Log Endpoints: http://localhost:${PORT}/api/activity-logs`);
  console.log(`💬 WhatsApp Reminder Endpoints: http://localhost:${PORT}/api/reminders`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=================================================`);
});
