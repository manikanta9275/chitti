const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const defaultAccounts = [
  {
    username: 'admin',
    displayName: 'Admin',
    pin: process.env.ADMIN_PIN || '9999',
    role: 'admin'
  },
  {
    username: 'mani',
    displayName: 'Mani',
    pin: '9275',
    role: 'user'
  },
  {
    username: 'mavayya',
    displayName: 'Mavayya',
    pin: '9278',
    role: 'user'
  },
  {
    username: 'ganesh',
    displayName: 'Ganesh',
    pin: '9280',
    role: 'user'
  }
];

const seedUsers = async () => {
  try {
    for (const account of defaultAccounts) {
      const existingUser = await User.findOne({ username: account.username });
      if (!existingUser) {
        const pinHash = await User.hashPin(account.pin);
        await User.create({
          username: account.username,
          displayName: account.displayName,
          pinHash,
          role: account.role,
          isActive: true
        });
        console.log(`👤 Seeded account: ${account.displayName} (${account.username}) [Role: ${account.role}]`);
      }
    }
    console.log('✅ Default users verification / seeding complete.');
  } catch (error) {
    console.error('❌ Error during user seeding:', error.message);
  }
};

// If run directly via "node utils/seedUsers.js"
if (require.main === module) {
  const runStandalone = async () => {
    try {
      const mongoURI = process.env.MONGO_URI;
      if (!mongoURI) {
        console.error('MONGO_URI is missing in backend/.env');
        process.exit(1);
      }
      await mongoose.connect(mongoURI, { dbName: 'chitti_db' });
      console.log('Connected to MongoDB. Running seeder...');
      await seedUsers();
      await mongoose.disconnect();
      console.log('Disconnected. Seeding finished.');
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };
  runStandalone();
}

module.exports = seedUsers;

