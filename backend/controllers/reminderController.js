const Payment = require('../models/Payment');
const ActivityLog = require('../models/ActivityLog');

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper to format phone number for WhatsApp wa.me link
// Strips non-digits, prepends country code 91 if 10-digit Indian number is provided
const formatWhatsAppPhone = (phone) => {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
};

// @desc    Generate prefilled WhatsApp reminder message and log activity
// @route   POST /api/reminders/generate
// @access  Admin only (Protected & Authorize('admin'))
const generateReminder = async (req, res) => {
  try {
    const { paymentId, customPhoneNumber } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required.'
      });
    }

    const payment = await Payment.findById(paymentId)
      .populate('memberId', 'name phoneNumber memberId')
      .populate('collectionPeriodId', 'month year');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found.'
      });
    }

    const memberName = payment.memberId?.name || 'Member';
    const rawPhone = customPhoneNumber || payment.memberId?.phoneNumber || '';
    const formattedPhone = formatWhatsAppPhone(rawPhone);

    const monthNum = payment.collectionPeriodId?.month || 10;
    const yearNum = payment.collectionPeriodId?.year || 2026;
    const dateNum = payment.collectionDate;

    const actualRupees = payment.actualAmountRupees || payment.actualAmountPaise / 100;
    const paidRupees = payment.totalPaidRupees || payment.totalPaidPaise / 100;
    const balanceRupees = payment.balanceRupees !== undefined ? payment.balanceRupees : Math.max(0, actualRupees - paidRupees);

    // Exact template required in Section 9 of specifications
    const message = `Hello ${memberName},

Your Chitti collection details for ${dateNum} ${MONTH_NAMES[monthNum]} ${yearNum}:

Actual Amount: ₹${actualRupees.toLocaleString('en-IN')}
Amount Paid: ₹${paidRupees.toLocaleString('en-IN')}
Remaining Balance: ₹${balanceRupees.toLocaleString('en-IN')}

Please pay the remaining balance at your earliest convenience.

Thank you.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // Log the reminder event to ActivityLog
    await ActivityLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'WHATSAPP_REMINDER_GENERATED',
      entityType: 'Payment',
      entityId: payment._id,
      previousValues: null,
      newValues: {
        member: memberName,
        phone: formattedPhone,
        date: `${dateNum} ${MONTH_NAMES[monthNum]} ${yearNum}`,
        remainingBalance: balanceRupees
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        memberName,
        rawPhone,
        formattedPhone,
        message,
        whatsappUrl,
        collectionDate: `${dateNum} ${MONTH_NAMES[monthNum]} ${yearNum}`,
        actualRupees,
        paidRupees,
        balanceRupees
      }
    });
  } catch (error) {
    console.error('generateReminder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating WhatsApp reminder.'
    });
  }
};

module.exports = {
  generateReminder,
  formatWhatsAppPhone
};

