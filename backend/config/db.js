const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.warn('⚠️ WARNING: MONGO_URI is not defined in your .env file!');
      console.warn('👉 Please configure MONGO_URI in backend/.env before continuing.');
      return;
    }

    const conn = await mongoose.connect(mongoURI, {
      dbName: 'chitti_db'
    });

    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    console.log(`📊 Connected Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
};

module.exports = connectDB;
