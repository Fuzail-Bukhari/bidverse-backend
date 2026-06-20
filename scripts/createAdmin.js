import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const hashedPassword = await bcrypt.hash("Admin@123456", 12);

  await User.collection.updateOne(
    { email: "admin@bidverse.com" },
    {
      $set: {
        name: "BidVerse Admin",
        email: "admin@bidverse.com",   // lowercase, written raw
        password: hashedPassword,
        role: "admin",
        isActive: true,
      },
    },
    { upsert: true }
  );

  // verify immediately
  const user = await User.findOne({ email: "admin@bidverse.com" }).select("+password");
  console.log("isActive:", user.isActive);
  console.log("password ok:", await bcrypt.compare("Admin@123456", user.password));

  process.exit(0);
});