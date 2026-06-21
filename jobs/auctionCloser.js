import cron from "node-cron";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
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
        // Find the highest bid for this auction
        const highestBid = await Bid.findOne({ auctionId: auction._id }).sort({
          amount: -1,
        });

        // Highest bidder wins (winner is null only if there were zero bids)
        if (highestBid) {
          auction.winnerId = highestBid.bidderId;
          auction.currentPrice = highestBid.amount;
        } else {
          auction.winnerId = null;
        }

        auction.status = "ended";
        await auction.save();

        // Notify seller
        await Notification.create({
          userId: auction.sellerId,
          message: auction.winnerId
            ? `Your auction "${auction.title}" ended and sold for $${auction.currentPrice}.`
            : `Your auction "${auction.title}" ended with no bids.`,
          type: "ended",
          auctionId: auction._id,
        });

        // Notify the winner if there is one
        if (auction.winnerId) {
          await Notification.create({
            userId: auction.winnerId,
            message: `Congratulations! You won "${auction.title}" with the highest bid of $${auction.currentPrice}.`,
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