import Bid from "../models/Bid.js";
import Auction from "../models/Auction.js";
import Notification from "../models/Notification.js";

export const placeBid = async (req, res) => {
  try {
    const { amount } = req.body;
    const auctionId = req.params.auctionId;
    const bidderId = req.user._id;

    // Get auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // Check auction is live
    if (auction.status !== "live") {
      return res.status(400).json({
        success: false,
        message: `Auction is ${auction.status}, bidding not allowed`,
      });
    }

    // Can't bid on your own auction
    if (auction.sellerId.toString() === bidderId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot bid on your own auction",
      });
    }

    // Bid must be higher than current price
    if (Number(amount) <= auction.currentPrice) {
      return res.status(400).json({
        success: false,
        message: `Bid must be higher than current price of $${auction.currentPrice}`,
      });
    }

    // Get previous highest bidder before updating
    const previousHighestBid = await Bid.findOne({ auctionId })
      .sort({ amount: -1 })
      .populate("bidderId", "name");

    // Create new bid
    const bid = await Bid.create({
      auctionId,
      bidderId,
      amount: Number(amount),
    });

    // Update auction current price, winner and total bids
    auction.currentPrice = Number(amount);
    auction.winnerId = bidderId;
    auction.totalBids += 1;
    await auction.save();

    // Notify previous highest bidder they've been outbid
    if (
      previousHighestBid &&
      previousHighestBid.bidderId._id.toString() !== bidderId.toString()
    ) {
      await Notification.create({
        userId: previousHighestBid.bidderId._id,
        message: `You've been outbid on "${auction.title}"! Current price is now $${amount}`,
        type: "outbid",
        auctionId: auction._id,
      });

      // Emit outbid notification via socket
      const io = req.app.get("io");
      io.to(previousHighestBid.bidderId._id.toString()).emit("outbid", {
        auctionId: auction._id,
        newAmount: amount,
        message: `You've been outbid on "${auction.title}"`,
      });
    }

    // Emit live bid update to auction room
    const io = req.app.get("io");
    io.to(auctionId).emit("new_bid", {
      auctionId,
      amount: Number(amount),
      bidderId,
      bidderName: req.user.name,
      totalBids: auction.totalBids,
      currentPrice: auction.currentPrice,
    });

    res.status(201).json({ success: true, bid, currentPrice: auction.currentPrice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBidsByAuction = async (req, res) => {
  try {
    const bids = await Bid.find({ auctionId: req.params.auctionId })
      .sort({ amount: -1 })
      .populate("bidderId", "name avatar");

    res.status(200).json({ success: true, count: bids.length, bids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ bidderId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("auctionId", "title currentPrice status images endTime");

    res.status(200).json({ success: true, count: bids.length, bids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getHighestBid = async (req, res) => {
  try {
    const bid = await Bid.findOne({ auctionId: req.params.auctionId })
      .sort({ amount: -1 })
      .populate("bidderId", "name avatar");

    if (!bid) {
      return res.status(404).json({ success: false, message: "No bids yet" });
    }

    res.status(200).json({ success: true, bid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};