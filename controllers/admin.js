const Tracker = require("../models/tracker");
const {
  blockIP,
  unblockIP,
  getBlockedIPs,
} = require("../utils/blockedIPMiddleware");

// ADMIN BLOCKED IPS - View and manage blocked IPs (get)
module.exports.blockedIPs = async (req, res) => {
  const blockedIPs = await getBlockedIPs();

  res.render("admin/blockedIPs", {
    title: "Blocked IPs - Admin",
    blockedIPs,
    currentPath: req.originalUrl,
  });
};

// ADMIN BLOCK IP - Add an IP to block list (post)
module.exports.blockIP = async (req, res) => {
  const { ip } = req.body;

  if (!ip) {
    req.flash("error", "IP address is required");
    return res.redirect("/admin/blocked-ips");
  }

  const success = await blockIP(ip);

  if (success) {
    req.flash("success", `IP ${ip} has been blocked`);
  } else {
    req.flash("error", "Failed to block IP address");
  }

  res.redirect("/admin/blocked-ips");
};

// ADMIN UNBLOCK IP - Remove an IP from block list (delete)
module.exports.unblockIP = async (req, res) => {
  const { ip } = req.body;
  console.log(ip);

  const origIP = ip.replace(/_/g, ".");

  const success = await unblockIP(origIP);

  if (success) {
    req.flash("success", `IP ${origIP} has been unblocked`);
  } else {
    req.flash("error", "Failed to unblock IP address");
  }

  res.redirect("/admin/blocked-ips");
};

// ADMIN TRACKER - View tracker analytics (get)
module.exports.tracker = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Get blocked IPs for statistics
  const statsArray = await Tracker.aggregate([
    {
      // Convert Maps to arrays and sum their values
      $project: {
        goodRouteValues: { $objectToArray: "$goodRoutes" },
        badRouteValues: { $objectToArray: "$badRoutes" },
        ip: 1,
      },
    },
    {
      $project: {
        goodSum: { $sum: "$goodRouteValues.v" },
        badSum: { $sum: "$badRouteValues.v" },
        ip: 1,
      },
    },
    {
      $group: {
        _id: null,
        totalGoodRoutes: { $sum: "$goodSum" },
        totalBadRoutes: { $sum: "$badSum" },
        uniqueIPs: { $addToSet: "$ip" },
      },
    },
    {
      $project: {
        _id: 0,
        totalGoodRoutes: 1,
        totalBadRoutes: 1,
        totalRoutes: { $sum: ["$totalGoodRoutes", "$totalBadRoutes"] },
        numberOfUniqueIPs: { $size: "$uniqueIPs" },
      },
    },
  ]);

  const stats = statsArray[0] || {
    totalGoodRoutes: 0,
    totalBadRoutes: 0,
    totalRoutes: 0,
    numberOfUniqueIPs: 0,
  };
  // Add blocked IPs count
  const blockedIPs = await getBlockedIPs();
  stats.numberOfBlockedIPs = blockedIPs.length;

  // Get country statistics
  const countryStats = await Tracker.aggregate([
    {
      $group: {
        _id: "$country",
        count: { $sum: "$timesVisited" },
        uniqueIPs: { $addToSet: "$ip" },
      },
    },
    {
      $addFields: {
        uniqueIPCount: { $size: "$uniqueIPs" },
      },
    },
    {
      $project: {
        uniqueIPs: 0,
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Get route statistics
  const routeStats = await Tracker.aggregate([
    {
      $project: {
        good: { $objectToArray: "$goodRoutes" },
        bad: { $objectToArray: "$badRoutes" },
      },
    },
    {
      $project: {
        routes: { $concatArrays: ["$good", "$bad"] },
      },
    },
    { $unwind: "$routes" },
    {
      $group: {
        _id: "$routes.k",
        total: { $sum: "$routes.v" },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);

  // Get recent tracker data with pagination
  const trackerData = await Tracker.find()
    .sort({ lastVisitDate: -1, lastVisitTime: -1 })
    .skip(skip)
    .limit(limit);

  const totalTrackerEntries = await Tracker.countDocuments();
  const totalPages = Math.ceil(totalTrackerEntries / limit);

  res.render("admin/tracker", {
    title: "Tracker Analytics - Admin",
    stats,
    countryStats,
    trackerData,
    routeStats,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      limit,
    },
    blockedIPs,
    currentPath: req.originalUrl,
  });
};
