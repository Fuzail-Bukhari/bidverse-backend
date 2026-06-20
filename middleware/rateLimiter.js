import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // generous cap for /api/auth (covers /me, /refresh for many users)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // strict: 10 login attempts per IP / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." },
});