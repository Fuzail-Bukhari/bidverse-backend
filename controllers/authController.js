import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES,
  });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  avatar: u.avatar,
});

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide name, email and password" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    // role can NEVER be admin via registration — only buyer/seller
    const allowedRole = ["buyer", "seller"].includes(role) ? role : "buyer";

    // plain password — the model's pre-save hook hashes it
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: allowedRole,
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    res.status(201).json({ success: true, accessToken, refreshToken, user: publicUser(user) });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Type check → blocks NoSQL injection like { "$gt": "" }
    if (typeof email !== "string" || typeof password !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +refreshToken"
    );

    // Generic message + small delay → no user enumeration / timing leak
    if (!user || !user.password) {
      await new Promise((r) => setTimeout(r, 200));
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (user.isLocked) {
      return res.status(429).json({
        success: false,
        message: "Account temporarily locked due to failed attempts. Try again later.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.registerFailedAttempt();
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "Your account has been suspended" });
    }

    await user.resetAttempts();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    res.status(200).json({ success: true, accessToken, refreshToken, user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: "" });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (typeof refreshToken !== "string") {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user._id);
    res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ success: false, message: "Refresh token expired" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};