import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MemberStatementModal({ member, collectionDate, onClose }) {
  const [statement, setStatement] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const memberId = member?._id || member?.id;
  const memberName = member?.name || 'Member';
  const memberCode = member?.memberId || '';
  const memberPhone = member?.phoneNumber || '';

  const fetchStatement = async () => {
    if (!memberId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${apiBaseUrl}/payments/member-statement/${memberId}`, {
        params: { date: collectionDate || undefined },
        timeout: 4000
      });
      if (res.data.success) {
        const stmt = res.data.statement || [];
        setStatement(stmt);
        try {
          localStorage.setItem(`chitti_statement_${memberId}`, JSON.stringify(stmt));
        } catch (e) {}
      }
    } catch (err) {
      // Offline fallback: load cached statement
      try {
        const cached = localStorage.getItem(`chitti_statement_${memberId}`);
        if (cached) {
          setStatement(JSON.parse(cached));
        } else {
          setError(err.response?.data?.message || 'Failed to load member statement history. Connect to network or pre-save data.');
        }
      } catch (e) {
        setError(err.response?.data?.message || 'Failed to load member statement history.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [memberId, collectionDate]);

  const handlePrint = () => {
    if (!statement || statement.length === 0) {
      alert('No statement data available to print.');
      return;
    }

    const lastEntry = statement[statement.length - 1];
    const totalActual = statement.reduce((sum, item) => sum + (Number(item.actualAmount) || 0), 0);
    const totalPaid = statement.reduce((sum, item) => sum + (Number(item.paidAmount) || 0), 0);
    const finalBalance = lastEntry ? Number(lastEntry.remainingAmount) || 0 : 0;
    const printDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const rowsHtml = statement.map((item, idx) => {
      const payDateFormatted = item.dateOfPay
        ? new Date(item.dateOfPay).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : '—';

      const isClear = item.remainingAmount === 0;

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
          <td style="text-align: center; color: #6c757d; font-size: 11px;">${idx + 1}</td>
          <td style="font-weight: 700; text-align: center; color: #212529;">${item.period}</td>
          <td style="color: #495057; font-size: 11px;">${payDateFormatted}</td>
          <td style="text-align: right; color: ${item.pendingAmount > 0 ? '#b02a37' : '#6c757d'}; font-weight: 600;">₹${(item.pendingAmount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align: right; font-weight: 500;">₹${(item.actualAmount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align: right; font-weight: 700; color: #0d6efd;">₹${(item.totalDue || 0).toLocaleString('en-IN')}</td>
          <td style="text-align: right; font-weight: 700; color: #198754;">₹${(item.paidAmount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align: right; font-weight: 800; color: ${isClear ? '#198754' : '#dc3545'};">
            ${isClear ? '₹0 (PAID)' : `₹${(item.remainingAmount || 0).toLocaleString('en-IN')}`}
          </td>
          <td style="font-size: 11px; color: #6c757d;">${item.note || '—'}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Statement_${memberName}_${memberCode}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 12px;
            color: #212529;
            background: #ffffff;
            font-size: 12px;
            line-height: 1.4;
          }
          .header-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0d6efd;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .logo-title-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-img {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #0d6efd;
          }
          .org-title {
            font-size: 20px;
            font-weight: 800;
            color: #0d6efd;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .doc-subtitle {
            font-size: 12px;
            color: #6c757d;
            margin: 2px 0 0 0;
            font-weight: 500;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #495057;
          }
          .info-grid {
            display: flex;
            justify-content: space-between;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 10px 16px;
            margin-bottom: 14px;
          }
          .info-item label {
            display: block;
            font-size: 10px;
            text-transform: uppercase;
            color: #6c757d;
            font-weight: 600;
            margin-bottom: 2px;
          }
          .info-item span {
            font-size: 13px;
            font-weight: 700;
            color: #212529;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          th {
            background-color: #0d6efd !important;
            color: #ffffff !important;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 8px 6px;
            border: 1px solid #0b5ed7;
          }
          td {
            padding: 7px 6px;
            border: 1px solid #dee2e6;
            font-size: 11px;
          }
          .summary-card {
            display: flex;
            justify-content: flex-end;
            margin-top: 8px;
            margin-bottom: 16px;
          }
          .summary-table {
            width: 340px;
            border-collapse: collapse;
          }
          .summary-table td {
            padding: 6px 12px;
            border: 1px solid #dee2e6;
            font-size: 12px;
          }
          .summary-table .highlight-row {
            background-color: #fff3cd !important;
            font-weight: 800;
            font-size: 14px;
          }
          .footer-note {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #dee2e6;
            padding-top: 10px;
            font-size: 10px;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="logo-title-group">
            <img src="/me_daddy.jpeg" class="logo-img" alt="Logo" onerror="this.style.display='none'">
            <div>
              <h1 class="org-title">CHITTI COLLECTION MANAGEMENT</h1>
              <p class="doc-subtitle">Member Running Ledger &amp; Payment Statement</p>
            </div>
          </div>
          <div class="meta-box">
            <div><strong>Statement Date:</strong> ${printDate}</div>
            <div><strong>System Status:</strong> Verified Records</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <label>Member Name</label>
            <span>${memberName}</span>
          </div>
          <div class="info-item">
            <label>Member Code</label>
            <span style="font-family: monospace;">${memberCode}</span>
          </div>
          <div class="info-item">
            <label>Phone Number</label>
            <span>${memberPhone || '—'}</span>
          </div>
          <div class="info-item">
            <label>Collection Day</label>
            <span>${collectionDate ? `${collectionDate}th of every month` : 'All Assigned Dates'}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 4%;">#</th>
              <th style="width: 8%;">Period</th>
              <th style="width: 17%;">Date &amp; Time of Payment</th>
              <th style="width: 11%; text-align: right;">Pending Amt</th>
              <th style="width: 12%; text-align: right;">Actual (This Month)</th>
              <th style="width: 12%; text-align: right;">Total Due</th>
              <th style="width: 12%; text-align: right;">Paid Amt</th>
              <th style="width: 12%; text-align: right;">Remaining Due</th>
              <th style="width: 12%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-card">
          <table class="summary-table">
            <tr>
              <td><strong>Total Month Dues:</strong></td>
              <td style="text-align: right; font-weight: 600;">₹${totalActual.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td><strong>Total Amount Paid:</strong></td>
              <td style="text-align: right; font-weight: 700; color: #198754;">₹${totalPaid.toLocaleString('en-IN')}</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>Net Balance Due:</strong></td>
              <td style="text-align: right; color: ${finalBalance > 0 ? '#dc3545' : '#198754'};">
                ₹${finalBalance.toLocaleString('en-IN')}
              </td>
            </tr>
          </table>
        </div>

        <div class="footer-note">
          <div>This is an official computer-generated statement from Chitti Collection System.</div>
          <div style="font-weight: 600;">Page 1 of 1</div>
        </div>
      </body>
      </html>
    `;

    // Seamless print via hidden iframe (works reliably on both laptops and phones)
    try {
      const existing = document.getElementById('chitti-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'chitti-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          // Fallback to new window if iframe print is restricted
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        }
      }, 350);
    } catch (e) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const getFormattedPhone = (raw) => {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits;
    }
    return digits;
  };

  const handleShareWhatsAppStatement = () => {
    if (!statement || statement.length === 0) return;

    let text = `*Chitti Fund - Payment Statement*\n`;
    text += `👤 *Member:* ${memberName} (${memberCode})\n`;
    if (collectionDate) text += `📅 *Collection Day:* ${collectionDate}th of every month\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    statement.forEach((item, idx) => {
      text += `*#${idx + 1} | Period: ${item.period}*\n`;
      if (item.dateOfPay) {
        const d = new Date(item.dateOfPay).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        text += `• Date: ${d}\n`;
      }
      text += `• Pending: ₹${item.pendingAmount.toLocaleString('en-IN')}\n`;
      text += `• Actual: ₹${item.actualAmount.toLocaleString('en-IN')}\n`;
      text += `• Total Due: ₹${item.totalDue.toLocaleString('en-IN')}\n`;
      text += `• Paid: ₹${item.paidAmount.toLocaleString('en-IN')}\n`;
      text += `• Remaining: ₹${item.remainingAmount.toLocaleString('en-IN')}\n`;
      if (item.note && item.note !== '—') {
        text += `• Remarks: ${item.note}\n`;
      }
      text += `\n`;
    });

    const lastEntry = statement[statement.length - 1];
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*Current Total Balance Due: ₹${(lastEntry ? lastEntry.remainingAmount : 0).toLocaleString('en-IN')}*\n`;
    text += `Thank you!`;

    const phone = getFormattedPhone(memberPhone);
    const encoded = encodeURIComponent(text);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content border-0 shadow-lg" id="printable-member-statement">
          {/* Header */}
          <div className="modal-header bg-dark text-white py-3">
            <div>
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2 mb-1">
                <i className="bi bi-file-earmark-spreadsheet text-info"></i>
                Detailed Payment History &amp; Statement — {memberName}
                <span className="badge bg-light text-dark font-monospace ms-1">{memberCode}</span>
              </h5>
              <small className="text-white-50">
                Tracking all transactions from the start till now &bull; Collection Date: {collectionDate ? `${collectionDate}th` : 'All Dates'} {memberPhone && `&bull; Phone: ${memberPhone}`}
              </small>
            </div>
            <div className="d-flex align-items-center gap-2">
              
            </div>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {/* Printable Letterhead Header for exported PDF */}
            <div className="d-none d-print-block border-bottom pb-3 mb-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h3 className="fw-bold mb-1 text-dark">Chitti Fund — Payment Statement</h3>
                  <p className="mb-0 text-secondary">
                    Member: <strong>{memberName}</strong> ({memberCode}) &bull; Phone: {memberPhone || '—'}
                  </p>
                </div>
                <div className="text-end text-muted small">
                  <div>Statement Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div>Collection Day: {collectionDate ? `${collectionDate}th of every month` : 'All assigned dates'}</div>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center gap-2 d-print-none">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div>{error}</div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                Loading complete statement records...
              </div>
            ) : statement.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                No payment history records found for this member.
              </div>
            ) : (
              <div className="table-responsive border rounded-3 shadow-xs">
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light small text-secondary">
                    <tr>
                      <th style={{ width: '4%' }}>#</th>
                      <th style={{ width: '9%' }}>Period</th>
                      <th style={{ width: '16%' }}>Date of Pay &amp; Time</th>
                      <th className="text-end" style={{ width: '11%' }}>Pending Amt</th>
                      <th className="text-end" style={{ width: '11%' }}>Actual (This Month)</th>
                      <th className="text-end" style={{ width: '11%' }}>Total Due</th>
                      <th className="text-end" style={{ width: '11%' }}>Paid That Month</th>
                      <th className="text-end" style={{ width: '11%' }}>Remaining Amt</th>
                      <th style={{ width: '16%' }}>Note / Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.map((item, index) => {
                      const isFullyCleared = item.remainingAmount === 0;
                      return (
                        <tr key={index} className="small">
                          <td className="text-muted">{index + 1}</td>
                          <td className="fw-semibold text-dark">
                            <span className="badge bg-light text-dark border">
                              {item.period}
                            </span>
                          </td>
                          <td className="text-muted">
                            {item.dateOfPay
                              ? new Date(item.dateOfPay).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })
                              : '—'}
                          </td>
                          {/* Pending Amount */}
                          <td className="text-end fw-semibold">
                            {item.pendingAmount > 0 ? (
                              <span className="text-warning-emphasis">₹{item.pendingAmount.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-muted">₹0</span>
                            )}
                          </td>
                          {/* Actual Amount in that month */}
                          <td className="text-end fw-semibold text-dark">
                            ₹{item.actualAmount.toLocaleString('en-IN')}
                          </td>
                          {/* Total Due (Pending + Actual) */}
                          <td className="text-end fw-bold text-dark">
                            ₹{item.totalDue.toLocaleString('en-IN')}
                          </td>
                          {/* Paid that month */}
                          <td className="text-end fw-bold text-success">
                            {item.paidAmount > 0 ? (
                              `₹${item.paidAmount.toLocaleString('en-IN')}`
                            ) : (
                              <span className="text-muted">₹0</span>
                            )}
                          </td>
                          {/* Remaining Amount */}
                          <td className="text-end fw-bold">
                            {isFullyCleared ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                <i className="bi bi-check2-circle me-1"></i>₹0
                              </span>
                            ) : (
                              <span className="text-danger">
                                ₹{item.remainingAmount.toLocaleString('en-IN')}
                              </span>
                            )}
                          </td>
                          {/* Note / Remarks */}
                          <td>
                            <span className="text-muted text-break">
                              {item.note || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between align-items-center d-print-none">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Statement calculates running balances sequentially from starting collection to current.
            </small>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-success btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
                onClick={handleShareWhatsAppStatement}
                disabled={loading || statement.length === 0}
                title="Send full statement to WhatsApp"
              >
                <i className="bi bi-whatsapp"></i> Send to WhatsApp
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
                onClick={handlePrint}
              >
                <i className="bi bi-printer-fill"></i> Print / Save as PDF
              </button>
              <button type="button" className="btn btn-secondary btn-sm px-4" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemberStatementModal;
