const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Member = require('../models/Member');

dotenv.config();

// 20 Sample initial members with their respective collection dates
const sampleMembers = [
  { memberId: 'M-001', name: 'Ravi Kumar', phoneNumber: '+919876543201', assignedDates: [5] },
  { memberId: 'M-002', name: 'Suresh Varma', phoneNumber: '+919876543202', assignedDates: [5] },
  { memberId: 'M-003', name: 'Kalyan Chakravarthy', phoneNumber: '+919876543203', assignedDates: [5] },
  { memberId: 'M-004', name: 'Venkat Rao', phoneNumber: '+919876543204', assignedDates: [10] },
  { memberId: 'M-005', name: 'Satyanarayana Murthy', phoneNumber: '+919876543205', assignedDates: [10] },
  { memberId: 'M-006', name: 'Prasad Raju', phoneNumber: '+919876543206', assignedDates: [10] },
  { memberId: 'M-007', name: 'Naveen Reddy', phoneNumber: '+919876543207', assignedDates: [15] },
  { memberId: 'M-008', name: 'Bhanu Prakash', phoneNumber: '+919876543208', assignedDates: [15] },
  { memberId: 'M-009', name: 'Chandra Sekhar', phoneNumber: '+919876543209', assignedDates: [15] },
  { memberId: 'M-010', name: 'Appala Naidu', phoneNumber: '+919876543210', assignedDates: [20] },
  { memberId: 'M-011', name: 'Dharma Teja', phoneNumber: '+919876543211', assignedDates: [20] },
  { memberId: 'M-012', name: 'Govind Raj', phoneNumber: '+919876543212', assignedDates: [20] },
  { memberId: 'M-013', name: 'Harish Babu', phoneNumber: '+919876543213', assignedDates: [20] },
  { memberId: 'M-014', name: 'Jagadeesh Paul', phoneNumber: '+919876543214', assignedDates: [25] },
  { memberId: 'M-015', name: 'Kishore Kumar', phoneNumber: '+919876543215', assignedDates: [25] },
  { memberId: 'M-016', name: 'Lakshmana Rao', phoneNumber: '+919876543216', assignedDates: [25] },
  { memberId: 'M-017', name: 'Madhava Krishna', phoneNumber: '+919876543217', assignedDates: [25] },
  { memberId: 'M-018', name: 'Nagaraju Goud', phoneNumber: '+919876543218', assignedDates: [30] },
  { memberId: 'M-019', name: 'Praveen Chowdary', phoneNumber: '+919876543219', assignedDates: [30] },
  { memberId: 'M-020', name: 'Rama Mohan', phoneNumber: '+919876543220', assignedDates: [30] }
];

const seedMembers = async () => {
  try {
    const count = await Member.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding initial 20 sample members with assigned collection dates...');
      await Member.insertMany(sampleMembers);
      console.log('✅ Successfully seeded 20 sample members into MongoDB Atlas.');
    } else {
      console.log(`ℹ️ Members collection already has ${count} members. Skipping seed.`);
    }
  } catch (error) {
    console.error('❌ Error during member seeding:', error.message);
  }
};

if (require.main === module) {
  const runStandalone = async () => {
    try {
      const mongoURI = process.env.MONGO_URI;
      await mongoose.connect(mongoURI, { dbName: 'chitti_db' });
      await seedMembers();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };
  runStandalone();
}

module.exports = seedMembers;
