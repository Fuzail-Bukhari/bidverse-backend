import express from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.patch("/mark-all-read", protect, markAllAsRead);
router.patch("/:id", protect, markAsRead);
router.delete("/clear-all", protect, clearAllNotifications);
router.delete("/:id", protect, deleteNotification);

export default router;