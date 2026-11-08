import axios from 'axios';

// Storage keys
const STORAGE_PREFIX = 'chitti_offline_';
const QUEUE_KEY = 'chitti_sync_queue';
const MEMBERS_KEY = `${STORAGE_PREFIX}members`;
const PERIODS_KEY = `${STORAGE_PREFIX}periods`;
const PAYMENTS_KEY = `${STORAGE_PREFIX}payments_`; // + month_year_date
const SUMMARY_KEY = `${STORAGE_PREFIX}summary_`; // + month_year
const CONFIG_KEY = `${STORAGE_PREFIX}config_`; // + month_year
const TRANSACTIONS_KEY = `${STORAGE_PREFIX}txs_`; // + paymentId

/**
 * Check if the browser is currently online
 */
export const isOnline = () => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

/**
 * Get all queued offline actions
 */
export const getSyncQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read sync queue:', e);
    return [];
  }
};

/**
 * Add an item to the sync queue
 */
export const addToSyncQueue = (action) => {
  try {
    const queue = getSyncQueue();
    const item = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      ...action
    };
    queue.push(item);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    // Dispatch custom event so UI buttons update immediately
    window.dispatchEvent(new Event('chitti_sync_queue_updated'));
    return item;
  } catch (e) {
    console.error('Failed to add to sync queue:', e);
    return null;
  }
};

/**
 * Clear or update the sync queue
 */
export const saveSyncQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('chitti_sync_queue_updated'));
  } catch (e) {
    console.error('Failed to save sync queue:', e);
  }
};

/**
 * Save collection payments to offline cache
 */
export const saveOfflinePayments = (month, year, date, payments, period) => {
  try {
    const key = `${PAYMENTS_KEY}${month}_${year}_${date}`;
    localStorage.setItem(key, JSON.stringify({ payments, period, updatedAt: Date.now() }));
  } catch (e) {
    console.warn('Failed to save payments to offline cache:', e);
  }
};

/**
 * Get collection payments from offline cache
 */
export const getOfflinePayments = (month, year, date) => {
  try {
    const key = `${PAYMENTS_KEY}${month}_${year}_${date}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Save dashboard summary to offline cache
 */
export const saveOfflineSummary = (month, year, summaryData) => {
  try {
    const key = `${SUMMARY_KEY}${month}_${year}`;
    localStorage.setItem(key, JSON.stringify({ data: summaryData, updatedAt: Date.now() }));
  } catch (e) {
    console.warn('Failed to save summary to offline cache:', e);
  }
};

/**
 * Get dashboard summary from offline cache
 */
export const getOfflineSummary = (month, year) => {
  try {
    const key = `${SUMMARY_KEY}${month}_${year}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).data : null;
  } catch (e) {
    return null;
  }
};

/**
 * Save members list to offline cache
 */
export const saveOfflineMembers = (membersData) => {
  try {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify({ data: membersData, updatedAt: Date.now() }));
  } catch (e) {
    console.warn('Failed to save members to offline cache:', e);
  }
};

/**
 * Get members list from offline cache
 */
export const getOfflineMembers = () => {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    return raw ? JSON.parse(raw).data : null;
  } catch (e) {
    return null;
  }
};

/**
 * Save collection config to offline cache
 */
export const saveOfflineConfig = (month, year, config) => {
  try {
    const key = `${CONFIG_KEY}${month}_${year}`;
    localStorage.setItem(key, JSON.stringify({ config, updatedAt: Date.now() }));
  } catch (e) {
    console.warn('Failed to save config to offline cache:', e);
  }
};

/**
 * Get collection config from offline cache
 */
export const getOfflineConfig = (month, year) => {
  try {
    const key = `${CONFIG_KEY}${month}_${year}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).config : null;
  } catch (e) {
    return null;
  }
};

/**
 * Save transactions history for a payment
 */
export const saveOfflineTransactions = (paymentId, transactions) => {
  try {
    localStorage.setItem(`${TRANSACTIONS_KEY}${paymentId}`, JSON.stringify(transactions));
  } catch (e) {
    console.warn('Failed to save transactions to offline cache:', e);
  }
};

/**
 * Get transactions history for a payment
 */
export const getOfflineTransactions = (paymentId) => {
  try {
    const raw = localStorage.getItem(`${TRANSACTIONS_KEY}${paymentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Record a payment locally: updates the cached payment record and adds to sync queue if offline
 */
export const recordPaymentLocally = (payment, amount, transactionType, notes, user, addToQueue = true) => {
  const paymentId = payment._id || payment.id;
  const numAmount = parseFloat(amount) || 0;

  // Calculate new paid & balance
  const currentPaid = payment.totalPaidRupees !== undefined
    ? payment.totalPaidRupees
    : (payment.totalPaidPaise ? payment.totalPaidPaise / 100 : 0);
  const actualRupees = payment.actualAmountRupees !== undefined
    ? payment.actualAmountRupees
    : (payment.actualAmountPaise ? payment.actualAmountPaise / 100 : 0);

  const newTotalPaidRupees = currentPaid + numAmount;
  const newTotalPaidPaise = Math.round(newTotalPaidRupees * 100);
  const newBalanceRupees = Math.max(0, actualRupees - newTotalPaidRupees);
  const newBalancePaise = Math.round(newBalanceRupees * 100);
  const newStatus = newBalanceRupees === 0 ? 'PAID' : (newTotalPaidRupees > 0 ? 'PARTIAL' : 'NOT_PAID');

  const updatedPayment = {
    ...payment,
    totalPaidRupees: newTotalPaidRupees,
    totalPaidPaise: newTotalPaidPaise,
    balanceRupees: newBalanceRupees,
    balancePaise: newBalancePaise,
    status: newStatus,
    lastUpdatedByName: user?.displayName || 'Offline User'
  };

  // Create local transaction
  const newTx = {
    _id: `offline_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    paymentId,
    amountRupees: numAmount,
    amountPaise: Math.round(numAmount * 100),
    transactionType: transactionType || (numAmount >= newBalanceRupees ? 'FULL_PAYMENT' : 'INSTALLMENT'),
    notes: notes || '',
    enteredByName: user?.displayName || 'Offline User',
    createdAt: new Date().toISOString()
  };

  // Update cached transactions
  const existingTxs = getOfflineTransactions(paymentId);
  saveOfflineTransactions(paymentId, [newTx, ...existingTxs]);

  // Update in cached collection payments list in all matching storage keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(PAYMENTS_KEY)) {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.payments)) {
            let found = false;
            const updatedList = parsed.payments.map((p) => {
              if (p._id === paymentId) {
                found = true;
                return { ...p, ...updatedPayment };
              }
              return p;
            });
            if (found) {
              localStorage.setItem(storageKey, JSON.stringify({ ...parsed, payments: updatedList, updatedAt: Date.now() }));
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error updating payment in offline cache:', e);
  }

  // Update in cached dashboard summaries in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(SUMMARY_KEY)) {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.data && Array.isArray(parsed.data.datesBreakdown)) {
            parsed.data.datesBreakdown.forEach(d => {
              if (Array.isArray(d.members)) {
                d.members.forEach(m => {
                  const mId = payment.memberId?._id || payment.memberId;
                  if (m.memberId === mId || m.memberId?._id === mId) {
                    m.balanceRupees = newBalanceRupees;
                  }
                });
              }
            });
            localStorage.setItem(storageKey, JSON.stringify(parsed));
          }
        }
      }
    }
  } catch (e) {}

  // Add to offline sync queue if requested
  if (addToQueue) {
    addToSyncQueue({
      type: 'RECORD_PAYMENT',
      paymentId,
      amount: numAmount,
      transactionType: newTx.transactionType,
      notes: newTx.notes,
      memberName: payment.memberId?.name || 'Member',
      memberCode: payment.memberId?.memberId || '',
      collectionDate: payment.collectionDate
    });
  }

  return updatedPayment;
};

/**
 * Update/Sync all queued offline actions to the real Database
 */
export const syncPendingToDatabase = async (apiBaseUrl, onProgress) => {
  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { success: true, count: 0, message: 'All data is already in sync with the database.' };
  }

  let successCount = 0;
  let failedCount = 0;
  const remainingQueue = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (onProgress) {
      onProgress(i + 1, queue.length, item);
    }

    try {
      if (item.type === 'RECORD_PAYMENT') {
        const res = await axios.post(`${apiBaseUrl}/payments/${item.paymentId}/transactions`, {
          amount: item.amount,
          transactionType: item.transactionType,
          notes: item.notes ? `${item.notes} (Synced from offline)` : 'Synced from offline'
        });
        if (res.data?.success) {
          successCount++;
        } else {
          remainingQueue.push(item);
          failedCount++;
        }
      } else if (item.type === 'ADD_MEMBER') {
        const res = await axios.post(`${apiBaseUrl}/members`, item.data);
        if (res.data?.success) {
          successCount++;
        } else {
          remainingQueue.push(item);
          failedCount++;
        }
      } else if (item.type === 'UPDATE_MEMBER') {
        const res = await axios.put(`${apiBaseUrl}/members/${item.memberId}`, item.data);
        if (res.data?.success) {
          successCount++;
        } else {
          remainingQueue.push(item);
          failedCount++;
        }
      } else if (item.type === 'CONFIGURE_COLLECTION') {
        const res = await axios.post(`${apiBaseUrl}/collections/configure`, item.data);
        if (res.data?.success) {
          successCount++;
        } else {
          remainingQueue.push(item);
          failedCount++;
        }
      } else if (item.type === 'ADD_DATE') {
        const res = await axios.post(`${apiBaseUrl}/collections/add-date`, item.data);
        if (res.data?.success) {
          successCount++;
        } else {
          remainingQueue.push(item);
          failedCount++;
        }
      } else {
        remainingQueue.push(item);
      }
    } catch (err) {
      console.error(`Sync error for item ${item.id}:`, err);
      remainingQueue.push(item);
      failedCount++;
    }
  }

  saveSyncQueue(remainingQueue);

  return {
    success: failedCount === 0,
    count: successCount,
    failedCount,
    message: failedCount === 0
      ? `Successfully updated ${successCount} record(s) to the database!`
      : `Updated ${successCount} record(s). ${failedCount} record(s) could not be synced yet.`
  };
};

/**
 * Pre-download all data for offline use
 */
export const downloadAllForOffline = async (apiBaseUrl, month, year) => {
  try {
    // 1. Fetch dashboard summary
    const summaryRes = await axios.get(`${apiBaseUrl}/payments/dashboard/summary`, {
      params: { month, year }
    });
    if (summaryRes.data?.success) {
      saveOfflineSummary(month, year, summaryRes.data);
    }

    // 2. Fetch current config
    const configRes = await axios.get(`${apiBaseUrl}/collections/current`, {
      params: { month, year }
    });
    if (configRes.data?.success && configRes.data?.period) {
      saveOfflineConfig(month, year, configRes.data.period);
    }

    // 3. Fetch members
    const membersRes = await axios.get(`${apiBaseUrl}/members`);
    if (membersRes.data?.success) {
      saveOfflineMembers(membersRes.data);
    }

    // 4. Fetch all collection dates payments
    const dates = summaryRes.data?.period?.collectionDates || [];
    for (const d of dates) {
      try {
        const pRes = await axios.get(`${apiBaseUrl}/payments`, {
          params: { month, year, date: d }
        });
        if (pRes.data?.success) {
          saveOfflinePayments(month, year, d, pRes.data.payments, pRes.data.period);
        }
      } catch (err) {
        console.warn(`Could not cache payments for date ${d}:`, err);
      }
    }

    return {
      success: true,
      message: `Downloaded and saved ${dates.length} collection date(s) and member data for offline use.`
    };
  } catch (err) {
    console.error('Failed to download data for offline use:', err);
    return {
      success: false,
      message: err.response?.data?.message || err.message || 'Failed to download data for offline use.'
    };
  }
};

