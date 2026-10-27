const Payment = require('../models/Payment');
const PaymentTransaction = require('../models/PaymentTransaction');
const CollectionPeriod = require('../models/CollectionPeriod');
const Member = require('../models/Member');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// Helper to get or initialize a collection period
const getOrInitPeriod = async (month, year, userId) => {
  let period = await CollectionPeriod.findOne({ month, year });
  const memberDates = await Member.distinct('assignedDates', { isActive: true });
  const activeDates = (memberDates && memberDates.length > 0) ? memberDates.sort((a, b) => a - b) : [];

  if (!period) {
    period = await CollectionPeriod.create({
      month,
      year,
      collectionDates: activeDates,
      basicAmountPaise: 500000, // ₹5,000
      bonusPaise: 0,
      actualAmountPaise: 500000, // ₹5,000
      createdBy: userId
    });
  } else if (activeDates.length > 0) {
    const merged = Array.from(new Set([...(period.collectionDates || []), ...activeDates])).sort((a, b) => a - b);
    if (merged.length !== (period.collectionDates || []).length) {
      period.collectionDates = merged;
      await period.save();
    }
  }
  return period;
};

// Get all payments for a specific collection date and month
const getCollectionPayments = async (req, res) => {
  try {
    const { month, year, date, search, status } = req.query;
    if (!month || !year || !date) {
      return res.status(400).json({ success: false, message: 'Month, year, and collection date are required.' });
    }
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const dateNum = parseInt(date, 10);

    const period = await getOrInitPeriod(monthNum, yearNum, req.user._id);
    const allActiveMembers = await Member.find({ isActive: true }).sort({ memberId: 1 });
    const membersAssignedToDate = allActiveMembers.filter(m => {
      const dates = m.assignedDates;
      if (!dates || dates.length === 0) return true;
      return dates.includes(dateNum);
    });

    // Ensure a Payment record exists for each member assigned to this date
    for (const member of membersAssignedToDate) {
      let carryForwardPaise = 0;
      let prevMonthNum = monthNum - 1;
      let prevYearNum = yearNum;
      if (prevMonthNum < 1) {
        prevMonthNum = 12;
        prevYearNum = yearNum - 1;
      }
      const prevPeriod = await CollectionPeriod.findOne({ month: prevMonthNum, year: prevYearNum });
      if (prevPeriod) {
        const prevPayment = await Payment.findOne({
          memberId: member._id,
          collectionPeriodId: prevPeriod._id,
          collectionDate: dateNum
        });
        if (prevPayment && prevPayment.balancePaise && prevPayment.balancePaise > 0) {
          carryForwardPaise = prevPayment.balancePaise;
        }
      }

      const existing = await Payment.findOne({
        memberId: member._id,
        collectionPeriodId: period._id,
        collectionDate: dateNum
      });

      if (!existing) {
        await Payment.create({
          memberId: member._id,
          collectionPeriodId: period._id,
          collectionDate: dateNum,
          actualAmountPaise: period.actualAmountPaise + carryForwardPaise,
          totalPaidPaise: 0,
          status: 'NOT_PAID',
          lastUpdatedByName: 'System'
        });
      } else {
        if (existing.totalPaidPaise === 0) {
          existing.actualAmountPaise = period.actualAmountPaise + carryForwardPaise;
          await existing.save();
        }
      }
    }

    let query = { collectionPeriodId: period._id, collectionDate: dateNum };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    let payments = await Payment.find(query)
      .populate('memberId', 'name phoneNumber memberId assignedDates isActive')
      .populate('lastUpdatedBy', 'username displayName')
      .sort({ createdAt: 1 });

    // Filter by assigned date (safety)
    payments = payments.filter(p => {
      if (!p.memberId || !p.memberId.isActive) return false;
      const dates = p.memberId.assignedDates;
      if (!dates || dates.length === 0) return true;
      return dates.includes(dateNum);
    });

    // Search filter
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      payments = payments.filter(p => {
        const nameMatch = p.memberId.name?.toLowerCase().includes(term);
        const phoneMatch = p.memberId.phoneNumber?.includes(term);
        const idMatch = p.memberId.memberId?.toLowerCase().includes(term);
        return nameMatch || phoneMatch || idMatch;
      });
    }

    const totalMembers = membersAssignedToDate.length;
    const actualAmountRupees = period.actualAmountRupees || period.actualAmountPaise / 100;
    const totalExpectedRupees = totalMembers * actualAmountRupees;

    let totalCollectedPaise = 0;
    let paidCount = 0;
    let partialCount = 0;
    let notPaidCount = 0;

    const allDatePayments = await Payment.find({
      collectionPeriodId: period._id,
      collectionDate: dateNum
    }).populate('memberId', 'assignedDates isActive');

    const relevantDatePayments = allDatePayments.filter(p => {
      if (!p.memberId || !p.memberId.isActive) return false;
      const dates = p.memberId.assignedDates;
      if (!dates || dates.length === 0) return true;
      return dates.includes(dateNum);
    });

    relevantDatePayments.forEach(p => {
      totalCollectedPaise += p.totalPaidPaise;
      if (p.status === 'PAID') paidCount++;
      else if (p.status === 'PARTIAL') partialCount++;
      else notPaidCount++;
    });

    const totalCollectedRupees = totalCollectedPaise / 100;
    const totalBalanceRupees = Math.max(0, totalExpectedRupees - totalCollectedRupees);

    return res.status(200).json({
      success: true,
      period: {
        id: period._id,
        month: period.month,
        year: period.year,
        basicAmountRupees: period.basicAmountRupees !== undefined ? period.basicAmountRupees : (period.basicAmountPaise ? period.basicAmountPaise / 100 : 5000),
        bonusRupees: period.bonusRupees !== undefined ? period.bonusRupees : (period.bonusPaise ? period.bonusPaise / 100 : 0),
        actualAmountRupees,
        collectionDates: period.collectionDates
      },
      collectionDate: dateNum,
      summary: {
        totalMembers,
        actualAmountRupees,
        totalExpectedRupees,
        totalCollectedRupees,
        totalBalanceRupees,
        paidCount,
        partialCount,
        notPaidCount
      },
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('getCollectionPayments error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error retrieving payments.' });
  }
};

// Add a payment transaction / installment (with advance carried forward to next month)
const addPaymentTransaction = async (req, res) => {
  try {
    const { amount, transactionType, notes } = req.body;
    const payment = await Payment.findById(req.params.id)
      .populate('memberId', 'name memberId assignedDates')
      .populate('collectionPeriodId');
    // After fetching, also determine previous period info for potential pending clearance
    const curPeriod = payment.collectionPeriodId;
    const curMonth = curPeriod ? curPeriod.month : null;
    const curYear = curPeriod ? curPeriod.year : null;
    let prevPeriodInfo = null;
    if (curMonth && curYear) {
      let prevMonthNum = curMonth - 1;
      let prevYearNum = curYear;
      if (prevMonthNum < 1) {
        prevMonthNum = 12;
        prevYearNum = curYear - 1;
      }
      prevPeriodInfo = await CollectionPeriod.findOne({ month: prevMonthNum, year: prevYearNum });
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number.' });
    }

    const totalAmountPaise = Math.round(amountNum * 100);
    const currentBalancePaise = Math.max(0, payment.actualAmountPaise - payment.totalPaidPaise);

    let appliedToCurrentPaise = 0;
    let excessPaise = 0;

    if (totalAmountPaise > currentBalancePaise) {
      appliedToCurrentPaise = currentBalancePaise;
      excessPaise = totalAmountPaise - currentBalancePaise;
    } else {
      appliedToCurrentPaise = totalAmountPaise;
    }

    let transaction = null;

    if (appliedToCurrentPaise > 0) {
      const previousValues = {
        totalPaidRupees: payment.totalPaidRupees,
        balanceRupees: payment.balanceRupees,
        status: payment.status
      };

      transaction = await PaymentTransaction.create({
        paymentId: payment._id,
        amountPaise: appliedToCurrentPaise,
        transactionType:
          transactionType ||
          (appliedToCurrentPaise === currentBalancePaise ? 'FULL_PAYMENT' : 'INSTALLMENT'),
        enteredBy: req.user._id,
        enteredByName: req.user.displayName,
        notes:
          notes?.trim() ??
          (excessPaise > 0
            ? `Cleared current month collection. Excess ₹${(excessPaise / 100).toLocaleString('en-IN')} carried forward.`
            : '')
      });

      payment.totalPaidPaise += appliedToCurrentPaise;
      payment.recalculateStatus();
      payment.lastUpdatedBy = req.user._id;
      payment.lastUpdatedByName = req.user.displayName;
      await payment.save();

      await ActivityLog.create({
        userId: req.user._id,
        username: req.user.username,
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: payment._id,
        previousValues,
        newValues: {
          member: payment.memberId?.name,
          addedAmountRupees: appliedToCurrentPaise / 100,
          totalPaidRupees: payment.totalPaidRupees,
          remainingBalanceRupees: payment.balanceRupees,
          status: payment.status,
          enteredByName: req.user.displayName
        }
      });
    }

    // ─── Retroactively clear previous‑month pending balance ────────────────────
    // If this payment fully paid the current balance (which may include carry‑forward
    // from the previous month), mark the previous month's matching payment as PAID
    // so the September view also reflects ₹0 balance.
    if (payment.status === 'PAID' && prevPeriodInfo) {
      try {
        const prevPaymentRecord = await Payment.findOne({
          memberId: payment.memberId._id,
          collectionPeriodId: prevPeriodInfo._id,
          collectionDate: payment.collectionDate
        });
        if (prevPaymentRecord && prevPaymentRecord.balancePaise > 0) {
          // Mark the previous month payment as fully paid by setting totalPaidPaise = actualAmountPaise
          prevPaymentRecord.totalPaidPaise = prevPaymentRecord.actualAmountPaise;
          prevPaymentRecord.recalculateStatus();
          prevPaymentRecord.lastUpdatedBy = req.user._id;
          prevPaymentRecord.lastUpdatedByName = req.user.displayName;
          await prevPaymentRecord.save();

          // Log the retroactive clearance
          await ActivityLog.create({
            userId: req.user._id,
            username: req.user.username,
            action: 'PAYMENT_RECORDED',
            entityType: 'Payment',
            entityId: prevPaymentRecord._id,
            previousValues: { status: 'PARTIAL' },
            newValues: {
              member: payment.memberId?.name,
              note: `Previous month pending cleared via current month payment`,
              status: 'PAID',
              enteredByName: req.user.displayName
            }
          });
        }
      } catch (prevErr) {
        console.error('Could not update previous month payment record:', prevErr);
        // Non-fatal: don't fail the entire request
      }
    }
    // ───────────────────────────────────────────────────────────────────────────

    let advanceDetails = null;
    if (excessPaise > 0) {
      const advCurPeriod = payment.collectionPeriodId;
      const advCurMonth = advCurPeriod ? advCurPeriod.month : 10;
      const advCurYear = advCurPeriod ? advCurPeriod.year : 2026;

      const nextMonth = advCurMonth === 12 ? 1 : advCurMonth + 1;
      const nextYear = advCurMonth === 12 ? advCurYear + 1 : advCurYear;

      const nextPeriod = await getOrInitPeriod(nextMonth, nextYear, req.user._id);
      const targetDate = payment.collectionDate;

      let nextPayment = await Payment.findOne({
        memberId: payment.memberId._id,
        collectionPeriodId: nextPeriod._id,
        collectionDate: targetDate
      });

      if (!nextPayment) {
        nextPayment = await Payment.create({
          memberId: payment.memberId._id,
          collectionPeriodId: nextPeriod._id,
          collectionDate: targetDate,
          actualAmountPaise: nextPeriod.actualAmountPaise,
          totalPaidPaise: 0,
          status: 'NOT_PAID',
          lastUpdatedByName: req.user.displayName
        });
      }

      await PaymentTransaction.create({
        paymentId: nextPayment._id,
        amountPaise: excessPaise,
        transactionType: 'INSTALLMENT',
        enteredBy: req.user._id,
        enteredByName: req.user.displayName,
        notes: `Advance payment carried forward from ${advCurMonth}/${advCurYear} (Date: ${payment.collectionDate}th)`
      });

      nextPayment.totalPaidPaise += excessPaise;
      nextPayment.recalculateStatus();
      nextPayment.lastUpdatedBy = req.user._id;
      nextPayment.lastUpdatedByName = req.user.displayName;
      await nextPayment.save();

      await ActivityLog.create({
        userId: req.user._id,
        username: req.user.username,
        action: 'ADVANCE_PAYMENT_CREDITED',
        entityType: 'Payment',
        entityId: nextPayment._id,
        previousValues: null,
        newValues: {
          member: payment.memberId?.name,
          advanceCreditedRupees: excessPaise / 100,
          creditedToPeriod: `${nextMonth}/${nextYear} (${targetDate}th)`,
          nextMonthTotalPaidRupees: nextPayment.totalPaidRupees,
          enteredByName: req.user.displayName
        }
      });

      advanceDetails = {
        nextMonth,
        nextYear,
        targetDate,
        excessRupees: excessPaise / 100
      };
    }

    const successMsg = advanceDetails
      ? `Payment of ₹${amountNum.toLocaleString('en-IN')} received for ${payment.memberId?.name}: ₹${(
          appliedToCurrentPaise / 100
        ).toLocaleString('en-IN')} cleared current month, and ₹${advanceDetails.excessRupees.toLocaleString(
          'en-IN'
        )} advance was credited to next month (${advanceDetails.nextMonth}/${advanceDetails.nextYear}).`
      : `Payment of ₹${amountNum.toLocaleString('en-IN')} recorded successfully for ${payment.memberId?.name}.`;

    return res.status(200).json({
      success: true,
      message: successMsg,
      payment,
      transaction,
      advanceDetails
    });
  } catch (error) {
    console.error('addPaymentTransaction error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error recording payment.' });
  }
};

// Get single payment details with transaction history
const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('memberId', 'name phoneNumber memberId assignedDates')
      .populate('collectionPeriodId')
      .populate('lastUpdatedBy', 'displayName username');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const transactions = await PaymentTransaction.find({ paymentId: payment._id })
      .sort({ createdAt: -1 })
      .populate('enteredBy', 'displayName username');

    return res.status(200).json({ success: true, payment, transactions });
  } catch (error) {
    console.error('getPaymentDetails error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error retrieving payment details.' });
  }
};

// Get overview summary for main dashboard across all dates in month
const getDashboardSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const monthNum = parseInt(month, 10) || now.getMonth() + 1;
    const yearNum = parseInt(year, 10) || now.getFullYear();

    const period = await getOrInitPeriod(monthNum, yearNum, req.user._id);
    const activeMembers = await Member.find({ isActive: true });

    const memberDates = await Member.distinct('assignedDates', { isActive: true });
    const collectionDates = (period.collectionDates && period.collectionDates.length > 0)
      ? period.collectionDates
      : (memberDates || []);
    const actualAmountRupees = period.actualAmountRupees || period.actualAmountPaise / 100;

    const allPeriodPayments = await Payment.find({ collectionPeriodId: period._id }).populate('memberId', 'assignedDates isActive');

    let totalCollectedMonthPaise = 0;
    let totalExpectedMonthRupees = 0;
    const dateStats = {};

    collectionDates.forEach(d => {
      const membersOnDate = activeMembers.filter(m => {
        const dates = m.assignedDates;
        if (!dates || dates.length === 0) return true;
        return dates.includes(d);
      });
      const count = membersOnDate.length;
      const expected = count * actualAmountRupees;
      totalExpectedMonthRupees += expected;
      dateStats[d] = {
        members: [],
        date: d,
        assignedMemberCount: count,
        expectedRupees: expected,
        collectedRupees: 0,
        balanceRupees: expected,
        paidCount: 0,
        partialCount: 0,
        notPaidCount: count
      };
    });


    // Determine previous month period and pending map (for carry‑forward)
    let prevMonthNum = monthNum - 1;
    let prevYearNum = yearNum;
    if (prevMonthNum < 1) {
      prevMonthNum = 12;
      prevYearNum = yearNum - 1;
    }
    const prevPeriod = await CollectionPeriod.findOne({ month: prevMonthNum, year: prevYearNum });
    const prevBaseActualRupees = prevPeriod ? (prevPeriod.actualAmountRupees || prevPeriod.actualAmountPaise / 100) : 0;
    const prevPendingMap = {};
    const prevDataByMemberAndDate = {};

    if (prevPeriod) {
      const prevPayments = await Payment.find({ collectionPeriodId: prevPeriod._id }).populate('memberId', 'assignedDates isActive');
      const prevPaymentIds = prevPayments.map(p => p._id);
      const prevTransactions = await PaymentTransaction.find({ paymentId: { $in: prevPaymentIds } }).sort({ createdAt: 1 });

      prevPayments.forEach(p => {
        if (!p.memberId) return;
        const key = `${p.memberId._id}-${p.collectionDate}`;
        const txs = prevTransactions.filter(t => t.paymentId.toString() === p._id.toString());

        let paidInPrev = 0;
        const prevEntries = [];

        if (txs.length > 0) {
          let runningPaid = 0;
          txs.forEach(tx => {
            const amt = tx.amountPaise / 100;
            runningPaid += amt;
            const bal = Math.max(0, prevBaseActualRupees - runningPaid);
            prevEntries.push({
              month: prevMonthNum,
              year: prevYearNum,
              collectionDate: p.collectionDate,
              amountPaidRupees: amt,
              balanceRupees: bal,
              status: bal === 0 ? 'PAID' : 'PARTIAL'
            });
          });
          paidInPrev = runningPaid;
        } else if (p.totalPaidPaise > 0) {
          const amt = p.totalPaidPaise / 100;
          paidInPrev = amt;
          const bal = Math.max(0, prevBaseActualRupees - amt);
          prevEntries.push({
            month: prevMonthNum,
            year: prevYearNum,
            collectionDate: p.collectionDate,
            amountPaidRupees: amt,
            balanceRupees: bal,
            status: bal === 0 ? 'PAID' : 'PARTIAL'
          });
        } else {
          paidInPrev = 0;
          prevEntries.push({
            month: prevMonthNum,
            year: prevYearNum,
            collectionDate: p.collectionDate,
            amountPaidRupees: 0,
            balanceRupees: prevBaseActualRupees,
            status: 'NOT_PAID'
          });
        }

        const initialPendingRupees = Math.max(0, prevBaseActualRupees - paidInPrev);
        if (initialPendingRupees > 0) {
          prevPendingMap[key] = Math.round(initialPendingRupees * 100);
        }

        prevDataByMemberAndDate[key] = {
          prevEntries,
          initialPendingRupees
        };
      });
    }

    // Compute previous month summary for reference
    let previousMonth = null;
    if (prevPeriod) {
      // Gather payments for previous period
      const prevPaymentsAll = await Payment.find({ collectionPeriodId: prevPeriod._id }).populate('memberId', 'assignedDates isActive');
      // Filter active members assigned to any date
      const prevActivePayments = prevPaymentsAll.filter(p => {
        if (!p.memberId || !p.memberId.isActive) return false;
        const dates = p.memberId.assignedDates;
        if (!dates || dates.length === 0) return true;
        return true; // all dates considered
      });
      let prevTotalCollectedPaise = 0;
      prevActivePayments.forEach(p => { prevTotalCollectedPaise += p.totalPaidPaise; });
      const prevTotalCollectedRupees = prevTotalCollectedPaise / 100;
      // Expected collection based on active members and actualAmountRupees of previous period
      const prevActualAmountRupees = prevPeriod.actualAmountRupees || prevPeriod.actualAmountPaise / 100;
      const prevActiveMembers = await Member.find({ isActive: true });
      const prevTotalExpected = prevActiveMembers.length * prevActualAmountRupees;
      const prevOutstanding = Math.max(0, prevTotalExpected - prevTotalCollectedRupees);
      previousMonth = {
        month: prevPeriod.month,
        year: prevPeriod.year,
        totalMembers: prevActiveMembers.length,
        totalExpectedCollection: prevTotalExpected,
        totalAmountCollected: prevTotalCollectedRupees,
        totalOutstandingBalance: prevOutstanding
      };
    }
    const activePeriodPayments = allPeriodPayments.filter(p => {
      if (!p.memberId || !p.memberId.isActive) return false;
      const dates = p.memberId.assignedDates;
      if (!dates || dates.length === 0) return true;
      return dates.includes(p.collectionDate);
    });

    activePeriodPayments.forEach(p => {
      totalCollectedMonthPaise += p.totalPaidPaise;
      const d = p.collectionDate;
      if (dateStats[d]) {
        const paidRupees = p.totalPaidPaise / 100;
        dateStats[d].collectedRupees += paidRupees;
        dateStats[d].balanceRupees = Math.max(0, dateStats[d].expectedRupees - dateStats[d].collectedRupees);
        if (p.status === 'PAID') {
          dateStats[d].paidCount++;
          dateStats[d].notPaidCount = Math.max(0, dateStats[d].notPaidCount - 1);
        } else if (p.status === 'PARTIAL') {
          dateStats[d].partialCount++;
          dateStats[d].notPaidCount = Math.max(0, dateStats[d].notPaidCount - 1);
        }

        const key = `${p.memberId._id}-${p.collectionDate}`;
        const prevInfo = prevDataByMemberAndDate[key] || { prevEntries: [], initialPendingRupees: 0 };
        const initialPendingRupees = prevInfo.initialPendingRupees || 0;
        const previousPendingRupees = initialPendingRupees;
        const payableRupees = actualAmountRupees + previousPendingRupees;
        const totalPaidCurrentPeriod = p.totalPaidPaise / 100;

        // How much of current month's payment cleared the previous month's pending debt?
        const clearedPendingRupees = initialPendingRupees > 0 ? Math.min(totalPaidCurrentPeriod, initialPendingRupees) : 0;
        const remainingPrevPendingRupees = Math.max(0, initialPendingRupees - clearedPendingRupees);

        const paymentHistory = [...prevInfo.prevEntries];

        // If there was a pending amount from previous month and it got cleared (either partially or fully) in current month:
        if (initialPendingRupees > 0 && clearedPendingRupees > 0) {
          paymentHistory.push({
            month: prevMonthNum,
            year: prevYearNum,
            collectionDate: p.collectionDate,
            amountPaidRupees: clearedPendingRupees,
            balanceRupees: remainingPrevPendingRupees,
            status: remainingPrevPendingRupees === 0 ? 'PAID' : 'PARTIAL'
          });
        }

        // Current month's own payment:
        const currentMonthPaidRupees = Math.max(0, totalPaidCurrentPeriod - initialPendingRupees);
        const currentMonthBalanceRupees = Math.max(0, actualAmountRupees - currentMonthPaidRupees);
        const currentMonthStatus = currentMonthBalanceRupees === 0 ? 'PAID' : (currentMonthPaidRupees > 0 ? 'PARTIAL' : 'NOT_PAID');

        paymentHistory.push({
          month: monthNum,
          year: yearNum,
          collectionDate: p.collectionDate,
          amountPaidRupees: currentMonthPaidRupees,
          balanceRupees: currentMonthBalanceRupees,
          status: currentMonthStatus
        });

        dateStats[d].members.push({
          memberId: p.memberId._id,
          payableRupees,
          previousPendingRupees,
          actualAmountRupees,
          balanceRupees: p.balancePaise ? p.balancePaise / 100 : 0,
          paymentHistory
        });
      }
    });

    const totalCollectedMonthRupees = totalCollectedMonthPaise / 100;
    const totalOutstandingMonthRupees = Math.max(0, totalExpectedMonthRupees - totalCollectedMonthRupees);

    return res.status(200).json({
      success: true,
      period: { id: period._id, month: period.month, year: period.year, actualAmountRupees, collectionDates },
      summary: {
        totalMembers: activeMembers.length,
        totalExpectedCollection: totalExpectedMonthRupees,
        totalAmountCollected: totalCollectedMonthRupees,
        totalOutstandingBalance: totalOutstandingMonthRupees
      },
      previousMonth,
      datesBreakdown: Object.values(dateStats)
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving dashboard summary.' });
  }
};

// Get comprehensive payment history / statement for a member from starting till now
const getMemberStatement = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { date } = req.query;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // Query all payments for this member
    const paymentQuery = { memberId };
    if (date) {
      paymentQuery.collectionDate = parseInt(date, 10);
    }
    const payments = await Payment.find(paymentQuery).populate('collectionPeriodId');

    // Sort payments chronologically by period year, period month, collectionDate
    payments.sort((a, b) => {
      const yearA = a.collectionPeriodId?.year || 0;
      const yearB = b.collectionPeriodId?.year || 0;
      if (yearA !== yearB) return yearA - yearB;
      const monthA = a.collectionPeriodId?.month || 0;
      const monthB = b.collectionPeriodId?.month || 0;
      if (monthA !== monthB) return monthA - monthB;
      return a.collectionDate - b.collectionDate;
    });

    const paymentIds = payments.map(p => p._id);
    const transactions = await PaymentTransaction.find({ paymentId: { $in: paymentIds } })
      .populate('enteredBy', 'displayName username')
      .sort({ createdAt: 1 });

    let runningPendingRupees = 0;
    const statement = [];

    // Loop through each payment record in chronological order
    for (const p of payments) {
      const period = p.collectionPeriodId;
      if (!period) continue;

      const baseActualRupees = period.actualAmountRupees || period.actualAmountPaise / 100;
      const pTxs = transactions.filter(t => t.paymentId.toString() === p._id.toString());
      const pendingBefore = runningPendingRupees;
      let totalDue = pendingBefore + baseActualRupees;

      if (pTxs.length > 0) {
        pTxs.forEach(tx => {
          const paidAmt = tx.amountPaise / 100;
          const rem = Math.max(0, totalDue - paidAmt);
          statement.push({
            period: `${period.month}/${period.year}`,
            collectionDate: p.collectionDate,
            dateOfPay: tx.createdAt,
            pendingAmount: pendingBefore,
            actualAmount: baseActualRupees,
            totalDue: totalDue,
            paidAmount: paidAmt,
            remainingAmount: rem,
            note: tx.notes || tx.transactionType || '—',
            enteredByName: tx.enteredByName || 'System'
          });
          totalDue = rem;
          runningPendingRupees = rem;
        });
      } else {
        // No transactions made yet in this month
        const rem = totalDue;
        statement.push({
          period: `${period.month}/${period.year}`,
          collectionDate: p.collectionDate,
          dateOfPay: p.createdAt,
          pendingAmount: pendingBefore,
          actualAmount: baseActualRupees,
          totalDue: totalDue,
          paidAmount: 0,
          remainingAmount: rem,
          note: 'No payment recorded',
          enteredByName: p.lastUpdatedByName || 'System'
        });
        runningPendingRupees = rem;
      }
    }

    return res.status(200).json({
      success: true,
      member: {
        id: member._id,
        name: member.name,
        memberId: member.memberId,
        phoneNumber: member.phoneNumber,
        assignedDates: member.assignedDates
      },
      collectionDate: date ? parseInt(date, 10) : null,
      statement
    });
  } catch (error) {
    console.error('getMemberStatement error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error retrieving member statement.' });
  }
};

module.exports = {
  getCollectionPayments,
  addPaymentTransaction,
  getPaymentDetails,
  getDashboardSummary,
  getMemberStatement
};
