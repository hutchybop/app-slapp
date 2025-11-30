const geoip = require("micro-geoip-lite");
const { Log } = require("../models/Log");

const encodeRoute = (route) => route.replace(/\./g, "__DOT__");

const logger = async (req, res, next) => {
  const ip =
    req.ipInfo?.ip ||
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.ip ||
    req.ips[0] ||
    "unknown";
  const route = encodeRoute(req.originalUrl);
  const now = new Date();

  try {
    // Find the document for the IP address
    const log = await Log.findOne({ ip });

    if (log) {
      // Document exists, update it
      log.timesVisited += 1;
      log.lastVisitDate = now.toLocaleDateString("en-GB");
      log.lastVisitTime = now.toLocaleTimeString("en-GB");
      log.routes.set(route, (log.routes.get(route) || 0) + 1);
      await log.save();
    } else {
      // Document does not exist, create a new one
      const geo = await geoip(ip);
      const newLog = new Log({
        ip,
        country: geo.country || "Unknown",
        city: geo.city || "Unknown",
        timesVisited: 1,
        lastVisitDate: now.toLocaleDateString("en-GB"),
        lastVisitTime: now.toLocaleTimeString("en-GB"),
        routes: new Map([[route, 1]]),
      });
      await newLog.save();
    }

    next();
  } catch (err) {
    console.error("Error logging visit:", err);
    next(err); // Pass the error to the next middleware
  }
};

module.exports = logger;
