const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./backend/models/User');

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected...');

    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123', // In a real app, we would hash this
    });

    const newUser = await user.save();
    console.log('Test user created:', newUser);

    mongoose.disconnect();
    console.log('MongoDB disconnected...');
  } catch (err) {
    console.error('Error creating user:', err);
  }
};

createTestUser();