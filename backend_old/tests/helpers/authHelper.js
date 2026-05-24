import jwt from "jsonwebtoken";
import User from "../../src/models/User.model.js";
import Wallet from "../../src/models/Wallet.model.js";

export const generateTestUser = async () => {
  const user = new User({
    name: "Test User",
    email: "test@solidus.dev",
    password: "Password123!", // The user model will hash this before saving
  });
  await user.save();

  const wallet = new Wallet({
    userId: user._id,
    balance: 0,
  });
  await wallet.save();

  return user;
};

export const generateTestToken = (userId) => {
  return jwt.sign(
    { id: userId, email: "test@solidus.dev" },
    process.env.JWT_ACCESS_SECRET || "test-jwt-access-secret-long-enough!",
    { expiresIn: "15m" }
  );
};
