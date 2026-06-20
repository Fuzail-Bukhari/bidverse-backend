import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["outbid", "won", "ended", "newBid", "general"],
      default: "general",
    },
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
