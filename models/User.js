import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 min

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minlength: 8, select: false },
    googleId: { type: String, default: null },
    avatar: { type: String, default: "" },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String, select: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

// Hash only when password changed → no double-hash on profile updates.
// Skips Google accounts that have no password.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.registerFailedAttempt = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= MAX_ATTEMPTS) {
      this.lockUntil = new Date(Date.now() + LOCK_TIME);
    }
  }
  await this.save();
};

userSchema.methods.resetAttempts = async function () {
  if (this.loginAttempts === 0 && !this.lockUntil) return;
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

export default mongoose.model("User", userSchema);