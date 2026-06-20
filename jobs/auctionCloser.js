import cron from "node-cron";
import Auction from "../models/Auction.js";
import Notification from "../models/Notification.js";

export const startAuctionCronJob = (io) => {
  // Runs every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Activate scheduled auctions whose startTime has passed
      await Auction.updateMany(
        { status: "scheduled", startTime: { $lte: now } },
        { status: "live" }
      );

      // Find all live auctions whose endTime has passed
      const expiredAuctions = await Auction.find({
        status: "live",
        endTime: { $lte: now },
      });

      for (const auction of expiredAuctions) {
        auction.status = "ended";
        await auction.save();

        // Notify seller
        await Notification.create({
          userId: auction.sellerId,
          message: `Your auction "${auction.title}" has ended.`,
          type: "ended",
          auctionId: auction._id,
        });

        // Notify winner if exists
        if (auction.winnerId) {
          await Notification.create({
            userId: auction.winnerId,
            message: `Congratulations! You won the auction "${auction.title}" with a bid of $${auction.currentPrice}.`,
            type: "won",
            auctionId: auction._id,
          });
        }

        // Emit to socket room
        io.to(auction._id.toString()).emit("auction_ended", {
          auctionId: auction._id,
          winnerId: auction.winnerId,
          finalPrice: auction.currentPrice,
        });
      }
    } catch (err) {
      console.error("Cron job error:", err.message);
    }
  });

  console.log("⏰ Auction cron job started");
};