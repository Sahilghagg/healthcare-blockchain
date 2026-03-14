const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");

router.post("/signup", async (req, res) => {

  const { name, email, password, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name,
    email,
    password: hashedPassword,
    role
  });

  await user.save();

  res.json({ message: "User created" });

});

router.post("/login", async (req, res) => {

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.status(400).send("Invalid password");

  res.json(user);

});

router.post("/update-wallet", async (req, res) => {
  const { userId, wallet } = req.body;
  await User.findByIdAndUpdate(userId, { wallet });
  res.json({ message: "Wallet updated" });
});

module.exports = router;