const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/auth/User');

require('dotenv').config();

async function seedUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = new User({ email: 'test@example.com', password: hashedPassword });
    await user.save();
    console.log('User seeded!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedUser();
