const mongoose = require('mongoose');
const dns = require('dns');

// On Windows or certain college/ISP networks, DNS SRV resolution for mongodb+srv://
// can fail with querySrv EBADRESP or ETIMEOUT. Configure reliable public DNS servers.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported in environment
}

// Direct shard replica set URI that connects directly without requiring SRV DNS resolution
const DIRECT_FALLBACK_URI =
  'mongodb://chitti_admin:manikanta9275@ac-uanmhhi-shard-00-00.qsbbey5.mongodb.net:27017,ac-uanmhhi-shard-00-01.qsbbey5.mongodb.net:27017,ac-uanmhhi-shard-00-02.qsbbey5.mongodb.net:27017/chitti_db?ssl=true&authSource=admin&retryWrites=true&w=majority';

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || DIRECT_FALLBACK_URI;

  try {
    const conn = await mongoose.connect(mongoURI, {
      dbName: 'chitti_db',
      serverSelectionTimeoutMS: 5000
    });

    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    console.log(`📊 Connected Database: ${conn.connection.name}`);
    return conn;
  } catch (primaryError) {
    console.warn(`⚠️ Primary MongoDB connection failed (${primaryError.message}).`);

    // If SRV failed or network had DNS issues, attempt the direct replica set URI
    if (mongoURI.includes('+srv') || primaryError.message.includes('querySrv')) {
      console.log('🔄 Attempting direct replica set connection (bypassing SRV DNS)...');
      try {
        const fallbackConn = await mongoose.connect(DIRECT_FALLBACK_URI, {
          dbName: 'chitti_db',
          serverSelectionTimeoutMS: 8000
        });
        console.log(`✅ MongoDB Connected Successfully (Direct Shards): ${fallbackConn.connection.host}`);
        console.log(`📊 Connected Database: ${fallbackConn.connection.name}`);
        return fallbackConn;
      } catch (fallbackError) {
        console.error(`❌ MongoDB Direct Connection Error: ${fallbackError.message}`);
      }
    } else {
      console.error(`❌ MongoDB Connection Error: ${primaryError.message}`);
    }
  }
};

module.exports = connectDB;
