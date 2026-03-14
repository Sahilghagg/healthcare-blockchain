const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json());

// Use the STANDARD connection string (not SRV)
mongoose.connect("mongodb://sahil:sahil123@ac-4tneqq3-shard-00-00.abezi5q.mongodb.net:27017,ac-4tneqq3-shard-00-01.abezi5q.mongodb.net:27017,ac-4tneqq3-shard-00-02.abezi5q.mongodb.net:27017/?ssl=true&replicaSet=atlas-kxzs3h-shard-0&authSource=admin&appName=healthcare-db")
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas successfully!");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("Full error:", err);
  });

app.use("/api", authRoutes);

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});