const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

const PORT = env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    return server;
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

const handleFatalError = (type, error) => {
  console.error(`[FATAL] ${type}:`, error);
  if (server && typeof server.close === 'function') {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(1);
    });
    // Force exit if connections do not drain within 5 seconds
    setTimeout(() => {
      console.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 5000).unref();
  } else {
    process.exit(1);
  }
};

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  handleFatalError('Uncaught Exception', err);
});

process.on('unhandledRejection', (reason) => {
  handleFatalError('Unhandled Rejection', reason);
});

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
