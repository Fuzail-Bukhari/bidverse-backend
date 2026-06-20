import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ success: true, message: "GET auctions works" });
});

router.post("/", (req, res) => {
  res.json({ success: true, message: "POST auctions works" });
});

export default router;