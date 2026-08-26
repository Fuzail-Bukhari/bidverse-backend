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
import aiRoutes from "./routes/ai.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
];

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
app.use(morgan("dev"));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.json({ message: "BidVerse API running 🚀" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    startAuctionCronJob(io);
    httpServer.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error("❌ DB connection error:", err));