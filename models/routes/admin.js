import express from "express";
import {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAllAuctionsAdmin,
  updateAuctionStatus,
} from "../controllers/adminController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { deleteAuction } from "../controllers/auctionController.js";

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, restrictTo("admin"));

router.get("/stats", getDashboardStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/toggle-status", toggleUserStatus);
router.delete("/users/:id", deleteUser);
router.get("/auctions", getAllAuctionsAdmin);
router.patch("/auctions/:id/status", updateAuctionStatus);
router.delete("/auctions/:id", deleteAuction);

export default router;