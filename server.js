import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import passport from "passport";
import "./config/passport.js";

import { initSocket } from "./socket/socketHandler.js";
import { startAuctionCronJob } from "./jobs/auctionCloser.js";

import authRoutes from "./routes/auth.js";
import googleAuthRoutes from "./routes/googleAuth.js";
import auctionRoutes from "./routes/auctions.js";
import bidRoutes from "./routes/bids.js";
import notificationRoutes from "./routes/notifications.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;

// Required on Railway / any reverse proxy so `secure` cookies and req.secure work.
app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initSocket(io);
app.set("io", io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(isProd ? "combined" : "dev"));
app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser tools (no origin) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(passport.initialize());

// Health check (Railway / uptime monitors hit this)
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "BidVerse API running 🚀" });
});

// 404 — unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(isProd ? {} : { stack: err.stack }),
  });
});

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    startAuctionCronJob(io);
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (${isProd ? "production" : "development"})`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

export default app;
