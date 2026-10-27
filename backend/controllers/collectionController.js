const CollectionPeriod = require('../models/CollectionPeriod');
const Payment = require('../models/Payment');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get all collection periods or search by month & year
// @route   GET /api/collections
// @access  Protected
const getCollectionPeriods = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};

    if (month) filter.month = parseInt(month, 10);
    if (year) filter.year = parseInt(year, 10);

    const periods = await CollectionPeriod.find(filter)
      .sort({ year: -1, month: -1 })
      .populate('createdBy', 'username displayName');

    return res.status(200).json({
      success: true,
      count: periods.length,
      periods
    });
  } catch (error) {
    console.error('getCollectionPeriods error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving collection periods.'
    });
  }
};

// @desc    Get or initialize current month's collection period
// @route   GET /api/collections/current
// @access  Protected
const getCurrentCollectionPeriod = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1); // 1-12
    const currentYear = parseInt(req.query.year, 10) || now.getFullYear();

    let period = await CollectionPeriod.findOne({
      month: currentMonth,
      year: currentYear
    });

    const Member = require('../models/Member');
    const memberDates = await Member.distinct('assignedDates', { isActive: true });
    const initialDates = (memberDates && memberDates.length > 0) ? memberDates.sort((a, b) => a - b) : [];

    // If this month is not yet initialized in DB, create default configuration
    if (!period) {
      period = await CollectionPeriod.create({
        month: currentMonth,
        year: currentYear,
        collectionDates: initialDates,
        basicAmountPaise: 500000, // ₹5,000
        bonusPaise: 0,
        actualAmountPaise: 500000, // ₹5,000
        createdBy: req.user._id
      });

      await ActivityLog.create({
        userId: req.user._id,
        username: req.user.username,
        action: 'COLLECTION_PERIOD_INITIALIZED',
        entityType: 'CollectionPeriod',
        entityId: period._id,
        previousValues: null,
        newValues: {
          month: currentMonth,
          year: currentYear,
          collectionDates: initialDates,
          basicAmountRupees: 5000,
          bonusRupees: 0,
          actualAmountRupees: 5000
        }
      });
    } else if (memberDates && memberDates.length > 0) {
      // Keep period dates in sync with active member dates
      const merged = Array.from(new Set([...(period.collectionDates || []), ...memberDates])).sort((a, b) => a - b);
      if (merged.length !== (period.collectionDates || []).length) {
        period.collectionDates = merged;
        await period.save();
      }
    }

    return res.status(200).json({
      success: true,
      period
    });
  } catch (error) {
    console.error('getCurrentCollectionPeriod error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving current collection period.'
    });
  }
};

// @desc    Create or update collection period configuration (dates and actual amount)
// @route   POST /api/collections/configure
// @access  Admin only
const configureCollectionPeriod = async (req, res) => {
  try {
    const { month, year, collectionDates, actualAmount, bonus, basicAmount } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required.'
      });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12.'
      });
    }

    // Validate collection dates
    let dates = collectionDates;
    if (typeof dates === 'string') {
      dates = dates.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => !isNaN(d));
    }

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid collection date is required.'
      });
    }

    // Sort and remove duplicates
    dates = Array.from(new Set(dates)).sort((a, b) => a - b);

    // Calculate amounts: basic (default 5000), bonus (default 0), and net actual collection amount
    const basicNum = basicAmount !== undefined && !isNaN(parseFloat(basicAmount)) ? parseFloat(basicAmount) : 5000;
    const bonusNum = bonus !== undefined && !isNaN(parseFloat(bonus)) ? Math.max(0, parseFloat(bonus)) : 0;
    let amountNum = parseFloat(actualAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      amountNum = Math.max(0, basicNum - bonusNum);
    }

    const actualAmountPaise = Math.round(amountNum * 100);
    const basicAmountPaise = Math.round(basicNum * 100);
    const bonusPaise = Math.round(bonusNum * 100);

    let period = await CollectionPeriod.findOne({ month: monthNum, year: yearNum });
    let previousValues = null;

    if (period) {
      previousValues = {
        collectionDates: period.collectionDates,
        basicAmountRupees: period.basicAmountRupees,
        bonusRupees: period.bonusRupees,
        actualAmountRupees: period.actualAmountRupees
      };
      period.collectionDates = dates;
      period.basicAmountPaise = basicAmountPaise;
      period.bonusPaise = bonusPaise;
      period.actualAmountPaise = actualAmountPaise;
      await period.save();
    } else {
      period = await CollectionPeriod.create({
        month: monthNum,
        year: yearNum,
        collectionDates: dates,
        basicAmountPaise,
        bonusPaise,
        actualAmountPaise,
        createdBy: req.user._id
      });
    }

    // Synchronize existing unpaid payment records for this period with new Present Month amount
    const unpaidPayments = await Payment.find({
      collectionPeriodId: period._id,
      totalPaidPaise: 0
    });

    let prevMonthNum = monthNum - 1;
    let prevYearNum = yearNum;
    if (prevMonthNum < 1) {
      prevMonthNum = 12;
      prevYearNum = yearNum - 1;
    }
    const prevPeriod = await CollectionPeriod.findOne({ month: prevMonthNum, year: prevYearNum });

    for (const payment of unpaidPayments) {
      let carryForwardPaise = 0;
      if (prevPeriod) {
        const prevPayment = await Payment.findOne({
          memberId: payment.memberId,
          collectionPeriodId: prevPeriod._id,
          collectionDate: payment.collectionDate
        });
        if (prevPayment && prevPayment.balancePaise && prevPayment.balancePaise > 0) {
          carryForwardPaise = prevPayment.balancePaise;
        }
      }
      payment.actualAmountPaise = period.actualAmountPaise + carryForwardPaise;
      await payment.save();
    }

    // Log admin action
    await ActivityLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: previousValues ? 'COLLECTION_CONFIG_UPDATED' : 'COLLECTION_CONFIG_CREATED',
      entityType: 'CollectionPeriod',
      entityId: period._id,
      previousValues,
      newValues: {
        month: monthNum,
        year: yearNum,
        collectionDates: dates,
        basicAmountRupees: basicNum,
        bonusRupees: bonusNum,
        actualAmountRupees: amountNum
      }
    });

    return res.status(200).json({
      success: true,
      message: `Collection configuration for ${monthNum}/${yearNum} saved successfully (Basic: ₹${basicNum.toLocaleString('en-IN')}, Bonus: ₹${bonusNum.toLocaleString('en-IN')}, Net: ₹${amountNum.toLocaleString('en-IN')}).`,
      period
    });
  } catch (error) {
    console.error('configureCollectionPeriod error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error configuring collection period.'
    });
  }
};

// @desc    Add a single collection date to active schedule
// @route   POST /api/collections/add-date
// @access  Admin only
const addCollectionDate = async (req, res) => {
  try {
    const { date, month, year } = req.body;
    const dateNum = parseInt(date, 10);
    if (isNaN(dateNum) || dateNum < 1 || dateNum > 31) {
      return res.status(400).json({ success: false, message: 'Valid date between 1 and 31 is required.' });
    }

    const now = new Date();
    const currentMonth = parseInt(month, 10) || (now.getMonth() + 1);
    const currentYear = parseInt(year, 10) || now.getFullYear();

    let period = await CollectionPeriod.findOne({ month: currentMonth, year: currentYear });
    if (!period) {
      period = await CollectionPeriod.create({
        month: currentMonth,
        year: currentYear,
        collectionDates: [dateNum],
        basicAmountPaise: 500000,
        bonusPaise: 0,
        actualAmountPaise: 500000,
        createdBy: req.user._id
      });
    } else {
      if (!period.collectionDates.includes(dateNum)) {
        period.collectionDates.push(dateNum);
        period.collectionDates.sort((a, b) => a - b);
        await period.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Collection date ${dateNum}th added successfully to schedule.`,
      collectionDates: period.collectionDates
    });
  } catch (error) {
    console.error('addCollectionDate error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error adding date.' });
  }
};

module.exports = {
  getCollectionPeriods,
  getCurrentCollectionPeriod,
  configureCollectionPeriod,
  addCollectionDate
};

