import express from "express";
const router = express.Router();

// Placeholder — we'll fill this next
router.get("/", (req, res) => {
  res.json({ success: true, message: "Notifications route working" });
});

export default router;