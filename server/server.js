const app = require('./app');

// Will be defined in config/env and config/db in the upcoming steps
let env;
try {
  env = require('./config/env');
} catch {
  require('dotenv').config();
  env = { PORT: process.env.PORT || 5000 };
}

let connectDB;
try {
  const dbConfig = require('./config/db');
  connectDB = dbConfig.connectDB || dbConfig;
} catch {
  connectDB = async () => {};
}

const PORT = env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    return server;
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
