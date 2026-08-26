import express from "express";
import multer from "multer";
import { generateListing, suggestBid, predictPrice } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

// Use disk storage for temp files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"));
    }
  },
});

const router = express.Router();

router.post("/generate-listing", protect, upload.single("image"), generateListing);
router.post("/suggest-bid", protect, suggestBid);
router.post("/predict-price", predictPrice);

export default router;