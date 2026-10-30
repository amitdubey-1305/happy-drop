// Set BEFORE importing mongodb-memory-server so it picks up the version
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-at-least-32-chars-long';
process.env.CLIENT_URL = 'http://localhost:5173,http://localhost:3000';
// Dummy MONGO_URI so env.js Zod validation doesn't exit the process during tests
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test-placeholder';
// Pin the in-memory binary version — MUST be set before requiring the module
process.env.MONGOMS_VERSION = '7.0.14';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Start an in-memory MongoDB 7.0.14 instance and connect mongoose to it.
 * Guard against calling connect() more than once (module is cached in --runInBand).
 */
const connect = async () => {
  if (mongoose.connection.readyState === 1) return; // already connected

  if (!mongoServer) {
    // Specify version programmatically — most reliable approach
    mongoServer = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
    });
  }

  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    driverInfo: {
      name: 'nodejs',
      version: '9.11.2',
      platform: process.platform,
    },
  });
};

/**
 * Clear all collections between tests to guarantee clean state.
 */
const clear = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    const clearPromises = Object.keys(collections).map((key) =>
      collections[key].deleteMany({})
    );
    await Promise.all(clearPromises);
  }
};

/**
 * Disconnect mongoose and stop the in-memory server.
 */
const close = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

module.exports = {
  connect,
  clear,
  close,
};
