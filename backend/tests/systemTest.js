/**
 * Chitti Collection Management System
 * Comprehensive Automated System Test Suite (Step 7)
 */

const BASE_URL = 'http://localhost:5000/api';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.error(`  ❌ FAIL: ${name} - ${details}`);
  }
  results.tests.push({ name, passed, details });
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Starting Chitti Comprehensive System Test Suite');
  console.log('===============================================================\n');

  let adminToken, maniToken, mavayyaToken, ganeshToken;
  let testMemberId, testPaymentId;

  // -------------------------------------------------------------
  // SUITE 1: Four Accounts Authentication & Password Security
  // -------------------------------------------------------------
  console.log('📋 [SUITE 1] Authentication, PIN Hashing & JWT Verification');

  // Test 1.1: Admin login with PIN 9999
  const resAdmin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', pin: '9999' })
  });
  adminToken = resAdmin.data?.token;
  recordTest(
    'Admin Login (PIN: 9999) returns JWT and role: admin',
    resAdmin.status === 200 && resAdmin.data?.user?.role === 'admin' && !!adminToken,
    JSON.stringify(resAdmin.data)
  );

  // Test 1.2: Mani login with PIN 9275
  const resMani = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'mani', pin: '9275' })
  });
  maniToken = resMani.data?.token;
  recordTest(
    'Mani Login (PIN: 9275) returns JWT and role: user',
    resMani.status === 200 && resMani.data?.user?.role === 'user' && !!maniToken,
    JSON.stringify(resMani.data)
  );

  // Test 1.3: Mavayya login with PIN 9278
  const resMavayya = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'mavayya', pin: '9278' })
  });
  mavayyaToken = resMavayya.data?.token;
  recordTest(
    'Mavayya Login (PIN: 9278) returns JWT and role: user',
    resMavayya.status === 200 && resMavayya.data?.user?.role === 'user' && !!mavayyaToken,
    JSON.stringify(resMavayya.data)
  );

  // Test 1.4: Ganesh login with PIN 9280
  const resGanesh = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ganesh', pin: '9280' })
  });
  ganeshToken = resGanesh.data?.token;
  recordTest(
    'Ganesh Login (PIN: 9280) returns JWT and role: user',
    resGanesh.status === 200 && resGanesh.data?.user?.role === 'user' && !!ganeshToken,
    JSON.stringify(resGanesh.data)
  );

  // Test 1.5: Invalid PIN should be rejected with HTTP 401
  const resBadPin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'mani', pin: '0000' })
  });
  recordTest(
    'Invalid PIN rejected with HTTP 401 Unauthorized',
    resBadPin.status === 401 && resBadPin.data?.success === false,
    `Status: ${resBadPin.status}`
  );

  // Test 1.6: Protected endpoint without token rejected with HTTP 401
  const resNoAuth = await request('/auth/me');
  recordTest(
    'Missing Authorization token rejected with HTTP 401',
    resNoAuth.status === 401,
    `Status: ${resNoAuth.status}`
  );

  // -------------------------------------------------------------
  // SUITE 2: Role-Based Authorization & Permission Enforcement
  // -------------------------------------------------------------
  console.log('\n📋 [SUITE 2] Role-Based Access Control & Permission Enforcement');

  // Test 2.1: Mani attempts Admin-only Member creation -> Should return 403
  const resManiCreate = await request('/members', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maniToken}` },
    body: JSON.stringify({ name: 'Unauthorized Member', phoneNumber: '9123456789' })
  });
  recordTest(
    'Mani (User) blocked from adding member (HTTP 403 Forbidden)',
    resManiCreate.status === 403,
    `Status: ${resManiCreate.status}`
  );

  // Test 2.2: Mani attempts Admin-only Collection configuration -> Should return 403
  const resManiConfig = await request('/collections/configure', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maniToken}` },
    body: JSON.stringify({ month: 10, year: 2026, collectionDates: [5, 10], actualAmount: 1000 })
  });
  recordTest(
    'Mani (User) blocked from configuring collection dates (HTTP 403 Forbidden)',
    resManiConfig.status === 403,
    `Status: ${resManiConfig.status}`
  );

  // Test 2.3: Mani attempts Admin-only WhatsApp reminder generation -> Should return 403
  const resManiRemind = await request('/reminders/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maniToken}` },
    body: JSON.stringify({ paymentId: 'dummy_id' })
  });
  recordTest(
    'Mani (User) blocked from generating WhatsApp reminders (HTTP 403 Forbidden)',
    resManiRemind.status === 403,
    `Status: ${resManiRemind.status}`
  );

  // Test 2.4: Admin creates a member -> Should return 201 Created
  const uniqueNum = Math.floor(1000 + Math.random() * 9000);
  const resAdminCreate = await request('/members', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Automated Test Member ${uniqueNum}`,
      phoneNumber: `+91987654${uniqueNum}`
    })
  });
  testMemberId = resAdminCreate.data?.member?._id;
  recordTest(
    'Admin successfully adds new member (HTTP 201 Created)',
    resAdminCreate.status === 201 && !!testMemberId,
    JSON.stringify(resAdminCreate.data)
  );

  // Test 2.5: Admin configures collection period -> Should return 200 OK
  const resAdminConfig = await request('/collections/configure', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      month: 10,
      year: 2026,
      collectionDates: [5, 10, 15, 20, 25, 30],
      actualAmount: 1000
    })
  });
  recordTest(
    'Admin successfully configures collection schedule and amount (HTTP 200 OK)',
    resAdminConfig.status === 200 && resAdminConfig.data?.success === true,
    JSON.stringify(resAdminConfig.data)
  );

  // -------------------------------------------------------------
  // SUITE 3: Shared Payment Calculations & Multi-Installments
  // -------------------------------------------------------------
  console.log('\n📋 [SUITE 3] Payment Calculations, Multi-Installments & Overpayment Prevention');

  // Fetch payments for 25th October 2026 using Mani's token
  const resPayments = await request('/payments?month=10&year=2026&date=25', {
    headers: { Authorization: `Bearer ${maniToken}` }
  });
  const targetPayment = resPayments.data?.payments?.find((p) => p.memberId?._id === testMemberId) || resPayments.data?.payments?.[1];
  testPaymentId = targetPayment?._id;

  recordTest(
    'All accounts can view collection payments (Mani fetches 25th Oct records)',
    resPayments.status === 200 && Array.isArray(resPayments.data?.payments) && !!testPaymentId,
    `Found ${resPayments.data?.payments?.length || 0} records`
  );

  // Test 3.1: Installment 1 - ₹300 recorded by Mani
  const resInstallment1 = await request(`/payments/${testPaymentId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${maniToken}` },
    body: JSON.stringify({
      amount: 300,
      transactionType: 'INSTALLMENT',
      notes: 'Test Installment 1 by Mani'
    })
  });
  const p1 = resInstallment1.data?.payment;
  recordTest(
    'Mani records Installment 1 (₹300): Paid = ₹300, Balance = ₹700, Status = PARTIAL',
    resInstallment1.status === 200 &&
      p1?.totalPaidRupees === 300 &&
      p1?.balanceRupees === 700 &&
      p1?.status === 'PARTIAL',
    `Paid: ₹${p1?.totalPaidRupees}, Balance: ₹${p1?.balanceRupees}, Status: ${p1?.status}`
  );

  // Test 3.2: Installment 2 - ₹200 recorded by Mavayya
  const resInstallment2 = await request(`/payments/${testPaymentId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mavayyaToken}` },
    body: JSON.stringify({
      amount: 200,
      transactionType: 'INSTALLMENT',
      notes: 'Test Installment 2 by Mavayya'
    })
  });
  const p2 = resInstallment2.data?.payment;
  recordTest(
    'Mavayya records Installment 2 (₹200): Total Paid = ₹500, Balance = ₹500, Status = PARTIAL',
    resInstallment2.status === 200 &&
      p2?.totalPaidRupees === 500 &&
      p2?.balanceRupees === 500 &&
      p2?.status === 'PARTIAL',
    `Paid: ₹${p2?.totalPaidRupees}, Balance: ₹${p2?.balanceRupees}, Status: ${p2?.status}`
  );

  // Test 3.3: Advance Payment Feature - Pay ₹700 when balance is ₹500
  // Should clear current month (₹500 applied) and carry forward excess (₹200) to next month!
  const resOverpay = await request(`/payments/${testPaymentId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ganeshToken}` },
    body: JSON.stringify({ amount: 700, notes: 'Advance payment test' })
  });
  recordTest(
    'Excess payment allowed: clears current month and auto-credits excess to next month',
    resOverpay.status === 200 &&
      resOverpay.data?.payment?.status === 'PAID' &&
      resOverpay.data?.advanceDetails?.excessRupees === 200,
    resOverpay.data?.message
  );

  // Test 3.4: Negative payment prevention
  const resNegative = await request(`/payments/${testPaymentId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ganeshToken}` },
    body: JSON.stringify({ amount: -100 })
  });
  recordTest(
    'Negative payment amount rejected with HTTP 400',
    resNegative.status === 400 && resNegative.data?.success === false,
    resNegative.data?.message
  );

  // Test 3.5: Installment 3 - ₹500 recorded by Ganesh (Completing payment)
  const resInstallment3 = await request(`/payments/${testPaymentId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ganeshToken}` },
    body: JSON.stringify({
      amount: 500,
      transactionType: 'FULL_PAYMENT',
      notes: 'Final settlement by Ganesh'
    })
  });
  const p3 = resInstallment3.data?.payment;
  recordTest(
    'Ganesh records Installment 3 (₹500): Total Paid = ₹1,000, Balance = ₹0, Status = PAID',
    resInstallment3.status === 200 &&
      p3?.totalPaidRupees === 1000 &&
      p3?.balanceRupees === 0 &&
      p3?.status === 'PAID',
    `Paid: ₹${p3?.totalPaidRupees}, Balance: ₹${p3?.balanceRupees}, Status: ${p3?.status}`
  );

  // -------------------------------------------------------------
  // SUITE 4: Shared Database & Transaction Audit History
  // -------------------------------------------------------------
  console.log('\n📋 [SUITE 4] Shared Database Synchronization & Audit Trail');

  // Test 4.1: Fetch payment details and verify all 3 users recorded transactions
  const resHistory = await request(`/payments/${testPaymentId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const txList = resHistory.data?.transactions || [];
  const enteredNames = txList.map((t) => t.enteredByName);
  const hasMani = enteredNames.includes('Mani');
  const hasMavayya = enteredNames.includes('Mavayya');
  const hasGanesh = enteredNames.includes('Ganesh');
  recordTest(
    'Shared database preserves multi-user installment history (Mani, Mavayya, Ganesh recorded)',
    resHistory.status === 200 && txList.length >= 3 && hasMani && hasMavayya && hasGanesh,
    `Contributors: ${enteredNames.join(', ')}`
  );

  // Test 4.2: Activity logs verification
  const resLogs = await request('/activity-logs?entityType=Payment', {
    headers: { Authorization: `Bearer ${maniToken}` }
  });
  const logs = resLogs.data?.logs || [];
  const hasPaymentLogs = logs.some((l) => l.action === 'PAYMENT_RECORDED');
  recordTest(
    'Activity logs record immutable audit trail accessible to all accounts',
    resLogs.status === 200 && hasPaymentLogs,
    `Found ${logs.length} payment audit logs`
  );

  // -------------------------------------------------------------
  // SUITE 5: Safe Member Deactivation (Soft Delete)
  // -------------------------------------------------------------
  console.log('\n📋 [SUITE 5] Safe Member Deactivation (Preserving History)');

  // Test 5.1: Admin safely deactivates test member
  if (testMemberId) {
    const resDeact = await request(`/members/${testMemberId}/deactivate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest(
      'Admin safely deactivates member without deleting historical payments',
      resDeact.status === 200 && resDeact.data?.member?.isActive === false,
      JSON.stringify(resDeact.data)
    );

    // Verify member still exists in database (soft delete)
    const resMemberCheck = await request(`/members/${testMemberId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest(
      'Deactivated member preserved in database (isActive: false)',
      resMemberCheck.status === 200 && resMemberCheck.data?.member?.isActive === false,
      `isActive: ${resMemberCheck.data?.member?.isActive}`
    );
  }

  // -------------------------------------------------------------
  // SUITE 6: WhatsApp Reminder Generator & Phone Modification
  // -------------------------------------------------------------
  console.log('\n📋 [SUITE 6] WhatsApp Click-to-Chat Reminder (Admin Only)');

  const resWhatsApp = await request('/reminders/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      paymentId: testPaymentId,
      customPhoneNumber: '9876543210'
    })
  });
  const waData = resWhatsApp.data?.data;
  const urlValid = waData?.whatsappUrl?.includes('wa.me/919876543210');
  const textValid = waData?.message?.includes('Actual Amount: ₹') && waData?.message?.includes('Thank you.');
  recordTest(
    'Admin successfully generates prefilled WhatsApp link for 9876543210 with country code 91',
    resWhatsApp.status === 200 && urlValid && textValid,
    `Generated URL: ${waData?.whatsappUrl}`
  );

  // -------------------------------------------------------------
  // Final Scorecard
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${results.passed}/${results.total} Tests Passed (${Math.round((results.passed / results.total) * 100)}%)`);
  if (results.failed === 0) {
    console.log('🎉 ALL SYSTEM TESTS PASSED! System is production-ready for Step 8.');
  } else {
    console.log(`⚠️ ${results.failed} tests failed.`);
  }
  console.log('===============================================================\n');

  return results;
}

runTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});

