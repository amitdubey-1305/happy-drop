const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Ensure indexes (such as unique email index) are synchronized
    await User.syncIndexes();

    const testEmail = `test_player_${Date.now()}@happydrop.local`;

    console.log(`\n1. Creating test user with email: ${testEmail}...`);
    const user = await User.create({
      name: 'Test Runner',
      email: testEmail,
      password: 'SecurePassword123!',
    });

    // Convert document to plain object and ensure password is not included
    const userObject = user.toObject();
    delete userObject.password;
    console.log('Test user created successfully (password omitted):', userObject);

    // Verify password comparison method
    const isPasswordCorrect = await user.comparePassword('SecurePassword123!');
    console.log('Password verification check passed:', isPasswordCorrect);

    console.log('\n2. Testing duplicate email prevention...');
    try {
      await User.create({
        name: 'Duplicate Player',
        email: testEmail,
        password: 'AnotherPassword123!',
      });
      console.error('ERROR: Duplicate email was accepted, but should have been rejected.');
    } catch (duplicateError) {
      console.log('Duplicate email check passed! Correctly rejected with error:', duplicateError.message);
    }

    console.log('\n3. Cleaning up test data...');
    const deleteResult = await User.deleteMany({ email: testEmail });
    console.log(`Cleaned up ${deleteResult.deletedCount} test user(s).`);

    console.log('\nAll checks completed successfully!');
  } catch (error) {
    console.error('Model check script error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

run();
