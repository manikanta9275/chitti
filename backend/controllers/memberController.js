const Member = require('../models/Member');
const Payment = require('../models/Payment');
const PaymentTransaction = require('../models/PaymentTransaction');
const ActivityLog = require('../models/ActivityLog');

// Helper to generate the next unique member ID (e.g., M-001, M-002, M-021)
const generateNextMemberId = async () => {
  const members = await Member.find({}, 'memberId');
  let maxNum = 0;
  for (const m of members) {
    if (m.memberId) {
      const match = m.memberId.match(/M-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return `M-${String(maxNum + 1).padStart(3, '0')}`;
};

// @desc    Get all members (with search, date filtering, and active filtering)
// @route   GET /api/members
// @access  Protected (All authenticated accounts)
const getMembers = async (req, res) => {
  try {
    const { search, includeInactive, date } = req.query;
    const filter = {};
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }
    if (date && date !== 'ALL') {
      filter.assignedDates = parseInt(date, 10);
    }
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { phoneNumber: searchRegex },
        { memberId: searchRegex }
      ];
    }
    const members = await Member.find(filter).sort({ memberId: 1 });
    const allActive = await Member.find({ isActive: true });
    const dateCounts = {};
    allActive.forEach(m => {
      const dList = m.assignedDates || [];
      dList.forEach(d => {
        dateCounts[d] = (dateCounts[d] || 0) + 1;
      });
    });
    return res.status(200).json({ success: true, count: members.length, totalActive: allActive.length, dateCounts, members });
  } catch (error) {
    console.error('getMembers error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving members.' });
  }
};

// @desc    Get single member by ID
// @route   GET /api/members/:id
// @access  Protected
const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
    return res.status(200).json({ success: true, member });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving member.' });
  }
};

// @desc    Add a new member with assigned collection dates
// @route   POST /api/members
// @access  Admin only
const createMember = async (req, res) => {
  try {
    const { name, phoneNumber, assignedDates } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Member name is required.' });
    if (!phoneNumber || !phoneNumber.trim()) return res.status(400).json({ success: false, message: 'Phone number is required.' });
    let dates = [5];
    if (Array.isArray(assignedDates) && assignedDates.length > 0) {
      dates = assignedDates.map(d => parseInt(d, 10)).filter(d => !isNaN(d) && d >= 1 && d <= 31);
      if (dates.length === 0) dates = [5];
    }
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    const memberId = await generateNextMemberId();
    const member = await Member.create({ memberId, name: name.trim(), phoneNumber: cleanPhone, assignedDates: dates, isActive: true });
    await ActivityLog.create({
      userId: req.user._id,
      username: req.user.username,
      userDisplayName: req.user.name || req.user.username,
      action: 'MEMBER_CREATED',
      entityType: 'Member',
      entityId: member._id,
      previousValues: null,
      newValues: { memberId: member.memberId, name: member.name, phoneNumber: member.phoneNumber, assignedDates: member.assignedDates }
    });
    return res.status(201).json({ success: true, message: `Member ${member.name} (${member.memberId}) added successfully for date(s): ${member.assignedDates.map(d => `${d}th`).join(', ')}.`, member });
  } catch (error) {
    console.error('createMember error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating member.' });
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Admin only
const updateMember = async (req, res) => {
  try {
    const { name, phoneNumber, assignedDates } = req.body;
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const previousValues = {
      name: member.name,
      phoneNumber: member.phoneNumber,
      assignedDates: member.assignedDates
    };

    if (name && name.trim()) member.name = name.trim();
    if (phoneNumber && phoneNumber.trim()) {
      member.phoneNumber = phoneNumber.trim().replace(/\s+/g, '');
    }
    if (Array.isArray(assignedDates) && assignedDates.length > 0) {
      const dates = assignedDates.map(d => parseInt(d, 10)).filter(d => !isNaN(d) && d >= 1 && d <= 31);
      if (dates.length > 0) {
        member.assignedDates = dates.sort((a, b) => a - b);
      }
    }

    await member.save();

    await ActivityLog.create({
      userId: req.user._id,
      username: req.user.username,
      userDisplayName: req.user.name || req.user.username,
      action: 'MEMBER_UPDATED',
      entityType: 'Member',
      entityId: member._id,
      previousValues,
      newValues: {
        name: member.name,
        phoneNumber: member.phoneNumber,
        assignedDates: member.assignedDates
      }
    });

    return res.status(200).json({
      success: true,
      message: `Member ${member.name} (${member.memberId}) updated successfully.`,
      member
    });
  } catch (error) {
    console.error('updateMember error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error updating member.' });
  }
};

// @desc    Safely deactivate a member (soft delete preserving historical payments)
// @route   PATCH /api/members/:id/deactivate
// @access  Admin only
const deactivateMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    member.isActive = false;
    await member.save();

    await ActivityLog.create({
      userId: req.user._id,
      username: req.user.username,
      userDisplayName: req.user.name || req.user.username,
      action: 'MEMBER_DEACTIVATED',
      entityType: 'Member',
      entityId: member._id,
      previousValues: { isActive: true },
      newValues: { isActive: false }
    });

    return res.status(200).json({
      success: true,
      message: `Member ${member.name} (${member.memberId}) deactivated successfully.`,
      member
    });
  } catch (error) {
    console.error('deactivateMember error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error deactivating member.' });
  }
};

// @desc    Reactivate a member
// @route   PATCH /api/members/:id/activate
// @access  Admin only
const activateMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    member.isActive = true;
    await member.save();

    await ActivityLog.create({
      userId: req.user._id,
      username: req.user.username,
      userDisplayName: req.user.name || req.user.username,
      action: 'MEMBER_ACTIVATED',
      entityType: 'Member',
      entityId: member._id,
      previousValues: { isActive: false },
      newValues: { isActive: true }
    });

    return res.status(200).json({
      success: true,
      message: `Member ${member.name} (${member.memberId}) reactivated successfully.`,
      member
    });
  } catch (error) {
    console.error('activateMember error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error activating member.' });
  }
};

// @desc    Delete all payment records (and transactions) for a member, optionally filtered by dates
// @route   DELETE /api/members/:id/payments
// @access  Admin only
const deleteMemberPayments = async (req, res) => {
  try {
    const memberId = req.params.id;
    const { dates } = req.body;
    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
    const paymentQuery = { memberId: member._id };
    if (Array.isArray(dates) && dates.length > 0) {
      paymentQuery.collectionDate = { $in: dates.map(d => parseInt(d, 10)) };
    }
    const payments = await Payment.find(paymentQuery);
    const paymentIds = payments.map(p => p._id);
    if (paymentIds.length > 0) {
      await PaymentTransaction.deleteMany({ paymentId: { $in: paymentIds } });
      await Payment.deleteMany({ _id: { $in: paymentIds } });
    }
    await ActivityLog.create({
      userId: req.user._id,
      username: req.user.username,
      userDisplayName: req.user.name || req.user.username,
      action: 'DELETE_MEMBER_PAYMENTS',
      entityType: 'Payment',
      entityId: member._id,
      previousValues: { memberId: member._id, memberName: member.name, dates: dates || 'ALL', count: payments.length },
      newValues: null
    });
    return res.status(200).json({
      success: true,
      message: `Deleted ${payments.length} payment records${dates && dates.length > 0 ? ' for selected dates' : ''} for member ${member.name}.`
    });
  } catch (error) {
    console.error('deleteMemberPayments error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during deletion.' });
  }
};

module.exports = {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deactivateMember,
  activateMember,
  deleteMemberPayments
};
