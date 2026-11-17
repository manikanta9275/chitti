require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const CollectionPeriod = require('./models/CollectionPeriod');
  const Payment = require('./models/Payment');
  const Member = require('./models/Member');

  const periods = await CollectionPeriod.find().sort({ year: 1, month: 1 });
  console.log('Periods in DB:', periods.map(p => ({
    id: p._id.toString(),
    month: p.month,
    year: p.year,
    collectionDates: p.collectionDates,
    actual: p.actualAmountRupees
  })));

  const payments = await Payment.find();
  console.log('Total payments in DB:', payments.length);
  const pByPeriod = {};
  payments.forEach(p => {
    const k = p.collectionPeriodId.toString();
    pByPeriod[k] = (pByPeriod[k] || 0) + 1;
  });
  console.log('Payments per period:', pByPeriod);

  const members = await Member.find();
  console.log('Total members:', members.length);
  console.log('Member assignedDates:', members.map(m => ({ id: m.memberId, name: m.name, dates: m.assignedDates, createdAt: m.createdAt })));

  await mongoose.disconnect();
}

run().catch(console.error);
