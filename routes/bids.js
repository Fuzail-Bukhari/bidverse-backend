import express from "express";
import {
  placeBid,
  getBidsByAuction,
  getMyBids,
  getHighestBid,
} from "../controllers/bidController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:auctionId", protect, placeBid);
router.get("/auction/:auctionId", getBidsByAuction);
router.get("/auction/:auctionId/highest", getHighestBid);
router.get("/my/bids", protect, getMyBids);

export default router;