const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { corsOptions } = require('./config/cors');
const { apiLimiter, gamesLimiter } = require('./config/rateLimiter');
const sanitizeNoSql = require('./middleware/sanitize');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const levelRoutes = require('./routes/levelRoutes');
const gameRoutes = require('./routes/gameRoutes');
const progressRoutes = require('./routes/progressRoutes');
const statsRoutes = require('./routes/statsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Running behind Render reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS with CLIENT_URL allow-list
app.use(cors(corsOptions));

// Request body size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// NoSQL injection protection middleware
app.use(sanitizeNoSql);

// HTTP request logging (dev in development, combined in production; skipped in test)
if (process.env.NODE_ENV !== 'test') {
  const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat));
}

// Global API rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/games', gamesLimiter, gameRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
