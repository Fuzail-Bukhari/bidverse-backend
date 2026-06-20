import mongoose from "mongoose";
import User from "../models/User.js";
import Auction from "../models/Auction.js"; // ⚠️ adjust path/name if yours differs

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const ALLOWED_ROLES = ["buyer", "seller", "admin"];
// ⚠️ match these to your Auction schema's status enum
const ALLOWED_AUCTION_STATUS = ["pending", "active", "closed", "cancelled"];

// ---------- DASHBOARD ----------
export const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalAdmins, totalAuctions, activeAuctions] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      Auction.countDocuments(),
      Auction.countDocuments({ status: "active" }),
    ]);

    res.status(200).json({
      success: true,
      stats: { totalUsers, totalAdmins, totalAuctions, activeAuctions },
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// ---------- USERS ----------
export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select("-password -refreshToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    res.status(200).json({ success: true, page, limit, total, users });
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot change your own role" });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // never let the last admin be demoted
    if (target.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot demote the last admin" });
      }
    }

    target.role = role;
    await target.save();

    res.status(200).json({
      success: true,
      message: "Role updated",
      user: { _id: target._id, name: target.name, email: target.email, role: target.role },
    });
  } catch (err) {
    console.error("updateUserRole error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot deactivate your own account" });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // never let the last active admin be deactivated
    if (target.role === "admin" && target.isActive) {
      const activeAdmins = await User.countDocuments({ role: "admin", isActive: true });
      if (activeAdmins <= 1) {
        return res.status(400).json({ success: false, message: "Cannot deactivate the last active admin" });
      }
    }

    target.isActive = !target.isActive;
    await target.save();

    res.status(200).json({
      success: true,
      message: `User ${target.isActive ? "activated" : "deactivated"}`,
      isActive: target.isActive,
    });
  } catch (err) {
    console.error("toggleUserStatus error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (target.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot delete the last admin" });
      }
    }

    await target.deleteOne();
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// ---------- AUCTIONS ----------
export const getAllAuctionsAdmin = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [auctions, total] = await Promise.all([
      Auction.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Auction.countDocuments(),
    ]);

    res.status(200).json({ success: true, page, limit, total, auctions });
  } catch (err) {
    console.error("getAllAuctionsAdmin error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const updateAuctionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid auction id" });
    }
    if (!ALLOWED_AUCTION_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const auction = await Auction.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    res.status(200).json({ success: true, message: "Auction status updated", auction });
  } catch (err) {
    console.error("updateAuctionStatus error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};