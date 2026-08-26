import express from "express";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES,
  });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
  }),
  async (req, res) => {
    try {
      const user = req.user;
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      await User.findByIdAndUpdate(user._id, { refreshToken });

      res.redirect(
        `${process.env.CLIENT_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
      );
    } catch (err) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

export default router;