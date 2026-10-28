import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MONTH_NAMES_EN = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_TE = [
  '', 'జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్',
  'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'
];

function WhatsAppModal({
  payment,
  baseMonthAmount = 0,
  basicAmount = 5000,
  bonus = 0,
  month,
  year,
  date,
  onClose
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [language, setLanguage] = useState('en'); // 'en' | 'te'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const memberName = payment.memberId?.name || 'Member';
  const initialPhone = payment.memberId?.phoneNumber || '';

  // Calculations
  const basicAmt = basicAmount || 5000;
  const bonusAmt = bonus || 0;
  const netMonthAmount = baseMonthAmount || Math.max(0, basicAmt - bonusAmt);
  const paymentActualAmt = payment.actualAmountRupees || (payment.actualAmountPaise ? payment.actualAmountPaise / 100 : 0);
  const pendingAmount = Math.max(0, paymentActualAmt - netMonthAmount);
  const totalAmount = netMonthAmount + pendingAmount;
  const paidAmount = payment.totalPaidRupees || (payment.totalPaidPaise ? payment.totalPaidPaise / 100 : 0);
  const balanceAmount = payment.balanceRupees !== undefined ? payment.balanceRupees : Math.max(0, totalAmount - paidAmount);

  // Clean and format phone number with country code 91 for India if 10 digits
  const getFormattedPhone = (raw) => {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits;
    }
    return digits;
  };

  const generateTemplate = (lang) => {
    if (lang === 'te') {
      const monthTe = MONTH_NAMES_TE[month] || '';
      return `నమస్కారం ${memberName} గారు,

${date} ${monthTe} ${year} చిట్టీ కలెక్షన్ చెల్లింపు వివరాలు:

• సాధారణ మొత్తం (Amount): ₹${basicAmt.toLocaleString('en-IN')}
• బోనస్ (Bonus): ₹${bonusAmt.toLocaleString('en-IN')}
• ప్రస్తుత నెల మొత్తం (This Month): ₹${netMonthAmount.toLocaleString('en-IN')}
• పాత బకాయి (Pending Amount): ₹${pendingAmount.toLocaleString('en-IN')}
• మొత్తం చెల్లించవలసినది (Total Amount): ₹${totalAmount.toLocaleString('en-IN')}
• చెల్లించిన మొత్తం (Total Paid Amount): ₹${paidAmount.toLocaleString('en-IN')}
• మిగిలిన బకాయి (Remaining Balance): ₹${balanceAmount.toLocaleString('en-IN')}

దయచేసి మిగిలిన బకాయి మొత్తాన్ని త్వరగా చెల్లించగలరు.

ధన్యవాదాలు.`;
    }

    const monthEn = MONTH_NAMES_EN[month] || '';
    return `Hello ${memberName},

Your Chitti Collection payment details for ${date} ${monthEn} ${year}:

• Amount: ₹${basicAmt.toLocaleString('en-IN')}
• Bonus: ₹${bonusAmt.toLocaleString('en-IN')}
• This Month Amount: ₹${netMonthAmount.toLocaleString('en-IN')}
• Pending Amount: ₹${pendingAmount.toLocaleString('en-IN')}
• Total Amount Due: ₹${totalAmount.toLocaleString('en-IN')}
• Total Paid Amount: ₹${paidAmount.toLocaleString('en-IN')}
• Remaining Balance: ₹${balanceAmount.toLocaleString('en-IN')}

Please clear the remaining balance at your earliest convenience.

Thank you.`;
  };

  // Generate initial default message
  useEffect(() => {
    setPhoneNumber(initialPhone);
    setMessage(generateTemplate(language));
  }, [payment, baseMonthAmount, basicAmount, bonus, month, year, date]);

  // When language switches, re-generate message
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setMessage(generateTemplate(lang));
  };

  const formattedPhone = getFormattedPhone(phoneNumber);
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodedText}` : '';

  const handleOpenWhatsApp = async () => {
    if (!formattedPhone || formattedPhone.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Notify backend to record reminder
      await axios.post(`${apiBaseUrl}/reminders/generate`, {
        paymentId: payment._id,
        customPhoneNumber: phoneNumber
      });
    } catch (err) {
      console.warn('Logging reminder on backend failed, continuing to open WhatsApp:', err);
    } finally {
      setLoading(false);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      onClose();
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg">
          {/* Header */}
          <div className="modal-header bg-success text-white py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-whatsapp fs-4"></i>
              Send WhatsApp Payment Reminder (Admin Only)
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            {error && (
              <div className="alert alert-danger py-2 small mb-3">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                {error}
              </div>
            )}

            {/* Member & Collection Overview */}
            <div className="p-3 bg-light rounded-3 border mb-3">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-6">
                  <span className="text-muted small d-block">Member Name</span>
                  <strong className="text-dark fs-5">{memberName}</strong>
                  <span className="badge bg-secondary-subtle text-secondary border font-monospace ms-2">
                    {payment.memberId?.memberId}
                  </span>
                </div>
                <div className="col-12 col-md-6 text-md-end">
                  <span className="text-muted small d-block">Collection Date</span>
                  <span className="fw-semibold text-primary">
                    {date} {MONTH_NAMES_EN[month]} {year}
                  </span>
                </div>
              </div>

              <hr className="my-2" />

              <div className="row g-2 text-center pt-1">
                <div className="col-4 col-md-2">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>Amount</small>
                  <span className="fw-bold text-secondary">₹{basicAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="col-4 col-md-2">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>Bonus</small>
                  <span className="fw-bold text-warning-emphasis">₹{bonusAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="col-4 col-md-2">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>This Month</small>
                  <span className="fw-bold text-primary">₹{netMonthAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="col-4 col-md-2">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>Pending</small>
                  <span className="fw-bold text-warning-emphasis">₹{pendingAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="col-4 col-md-2">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>Total Paid</small>
                  <span className="fw-bold text-success">₹{paidAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="col-4 col-md-2">
                  <small className="text-muted d-block" style={{ fontSize: '11px' }}>Remaining</small>
                  <span className="fw-bold text-danger">₹{balanceAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary d-flex justify-content-between mb-1">
                <span>
                  WhatsApp Phone Number <span className="text-danger">*</span>
                </span>
                <span className="text-muted font-monospace small">
                  Formatted: <strong>+{formattedPhone || '—'}</strong>
                </span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-success fw-bold">
                  <i className="bi bi-telephone-fill me-1"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-lg fw-bold font-monospace"
                  placeholder="e.g. 9876543210 or +919876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <small className="text-muted">
                10-digit Indian mobile numbers will automatically have <code>+91</code> added.
              </small>
            </div>

            {/* Language Selector Tabs */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label small fw-bold text-dark mb-0">
                  <i className="bi bi-translate text-primary me-1"></i>
                  Select Message Language / భాషను ఎంచుకోండి:
                </label>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn px-3 fw-semibold ${language === 'en' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => handleLanguageChange('en')}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    className={`btn px-3 fw-semibold ${language === 'te' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => handleLanguageChange('te')}
                  >
                    తెలుగు (Telugu)
                  </button>
                </div>
              </div>
            </div>

            {/* Editable Message Preview */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label small fw-semibold text-secondary mb-0">
                  Message Preview ({language === 'te' ? 'Telugu' : 'English'} — Editable)
                </label>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
                  onClick={handleCopyMessage}
                >
                  <i className={`bi ${copied ? 'bi-check-all text-success' : 'bi-clipboard'} me-1`}></i>
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
              </div>
              <textarea
                className="form-control font-monospace text-dark"
                rows="8"
                style={{ fontSize: '13px', lineHeight: '1.5' }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              ></textarea>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success fw-bold d-inline-flex align-items-center gap-2 px-4 shadow-sm"
              onClick={handleOpenWhatsApp}
              disabled={loading}
            >
              <i className="bi bi-whatsapp fs-5"></i>
              {loading ? 'Opening...' : 'Send on WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppModal;
