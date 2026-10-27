// Delete collection date payments / reset database
// Admin-only operations

const Payment = require('../models/Payment');
const PaymentTransaction = require('../models/PaymentTransaction');
const CollectionPeriod = require('../models/CollectionPeriod');
const ActivityLog = require('../models/ActivityLog');
const Member = require('../models/Member');
const User = require('../models/User');

/**
 * @desc Delete all payment data for a given month, year and collection date
 * @route DELETE /api/collections/date
 * @access Admin only
 */
const deleteAllPaymentsForDate = async (req, res) => {
  try {
    const { month, year, date, deleteFromSchedule } = req.body;
    if (!month || !year || !date) {
      return res.status(400).json({ success: false, message: 'Month, year and date are required.' });
    }
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const dateNum = parseInt(date, 10);

    // Find the collection period
    const period = await CollectionPeriod.findOne({ month: monthNum, year: yearNum });
    if (!period) {
      return res.status(404).json({ success: false, message: 'Collection period not found.' });
    }

    // Find payments for this date
    const payments = await Payment.find({ collectionPeriodId: period._id, collectionDate: dateNum });
    const paymentIds = payments.map(p => p._id);

    // Delete related transactions (if any)
    if (paymentIds.length > 0) {
      await PaymentTransaction.deleteMany({ paymentId: { $in: paymentIds } });
    }

    // Delete the payments themselves
    await Payment.deleteMany({ collectionPeriodId: period._id, collectionDate: dateNum });

    // Optionally remove the date from this month's collection schedule
    let dateRemoved = false;
    if (deleteFromSchedule) {
      period.collectionDates = (period.collectionDates || []).filter(d => d !== dateNum);
      await period.save();
      dateRemoved = true;
    }

    // Log admin action
    await ActivityLog.create({
      userId: req.user._id,
      username: req.user.username,
      userDisplayName: req.user.displayName || req.user.username,
      action: 'DELETE_ALL_PAYMENTS_FOR_DATE',
      entityType: 'Payment',
      entityId: period._id,
      previousValues: { month: monthNum, year: yearNum, date: dateNum, count: payments.length, dateRemoved },
      newValues: null
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${payments.length} payment records for date ${dateNum} (${monthNum}/${yearNum})${dateRemoved ? ' and removed date from schedule' : ''}.`
    });
  } catch (error) {
    console.error('deleteAllPaymentsForDate error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during deletion.' });
  }
};

/**
 * @desc Completely wipe members, payments, transactions, periods, and activity logs
 * @route DELETE /api/collections/reset-database
 * @access Admin only (Requires PIN 9999 confirmation)
 */
const resetAllDatabaseData = async (req, res) => {
  try {
    const { pin } = req.body;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    if (pin) {
      const user = await User.findById(req.user._id).select('+pinHash');
      const isMatch = await user.matchPin(String(pin));
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid Admin PIN.' });
      }
    }

    const deletedMembers = await Member.deleteMany({});
    const deletedPayments = await Payment.deleteMany({});
    const deletedTransactions = await PaymentTransaction.deleteMany({});
    const deletedPeriods = await CollectionPeriod.deleteMany({});
    const deletedLogs = await ActivityLog.deleteMany({});

    return res.status(200).json({
      success: true,
      message: 'All database records (Members, Payments, Transactions, Collection Dates, and Activity History) have been completely wiped.',
      stats: {
        members: deletedMembers.deletedCount,
        payments: deletedPayments.deletedCount,
        transactions: deletedTransactions.deletedCount,
        periods: deletedPeriods.deletedCount,
        logs: deletedLogs.deletedCount
      }
    });
  } catch (error) {
    console.error('resetAllDatabaseData error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during database reset.' });
  }
};

module.exports = {
  deleteAllPaymentsForDate,
  resetAllDatabaseData
};
