import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (user) {
          if (!user.googleId) {
            await User.findByIdAndUpdate(user._id, {
              googleId: profile.id,
              avatar: user.avatar || profile.photos[0]?.value || "",
            });
          }
          return done(null, user);
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(
          Math.random().toString(36).slice(-12) + "Aa1!",
          salt
        );

        user = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          avatar: profile.photos[0]?.value || "",
          role: "buyer",
          password: hashedPassword,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;