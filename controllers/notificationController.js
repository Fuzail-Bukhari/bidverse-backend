import Notification from "../models/Notification.js";

// @GET /api/notifications — get my notifications
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("auctionId", "title images currentPrice");

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.status(200).json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PATCH /api/notifications/:id — mark single as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PATCH /api/notifications/mark-all-read — mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/notifications/:id — delete single
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/notifications — clear all
export const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: "All notifications cleared",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};