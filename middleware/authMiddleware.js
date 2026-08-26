import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) token = header.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
};

// restrictTo("admin")  or  restrictTo("admin", "seller")
export const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
  }
  next();
};

// convenience alias, same as restrictTo("admin")
export const adminOnly = restrictTo("admin");