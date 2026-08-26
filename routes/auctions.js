import express from "express";
import {
  createAuction,
  getAllAuctions,
  getAuction,
  updateAuction,
  deleteAuction,
  getMyAuctions,
} from "../controllers/auctionController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

router.get("/", getAllAuctions);
router.get("/my", protect, getMyAuctions);
router.get("/:id", getAuction);
router.post(
  "/",
  protect,
  restrictTo("seller"),
  upload.array("images", 5),
  createAuction
);
router.put(
  "/:id",
  protect,
  upload.array("images", 5),
  updateAuction
);
router.delete("/:id", protect, deleteAuction);

export default router;