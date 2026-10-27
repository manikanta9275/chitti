const ActivityLog = require('../models/ActivityLog');

// @desc    Get paginated activity audit logs
// @route   GET /api/activity-logs
// @access  Protected (All authenticated accounts: Admin, Mani, Mavayya, Ganesh)
const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { entityType, search } = req.query;
    const filter = {};

    if (entityType && entityType !== 'ALL') {
      filter.entityType = entityType;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { action: searchRegex },
        { username: searchRegex },
        { userDisplayName: searchRegex }
      ];
    }

    const totalLogs = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'displayName role username');

    return res.status(200).json({
      success: true,
      count: logs.length,
      totalLogs,
      totalPages: Math.ceil(totalLogs / limit) || 1,
      currentPage: page,
      logs
    });
  } catch (error) {
    console.error('getActivityLogs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving activity logs.'
    });
  }
};

module.exports = {
  getActivityLogs
};

