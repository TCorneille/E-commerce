const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables FIRST
dotenv.config({ path: "./config.env" });

console.log(
  "RESEND KEY LOADED:",
  process.env.RESEND_API_KEY ? "YES" : "NO"
);

console.log(
  "DATABASE LOADED:",
  process.env.DATABASE ? "YES" : "NO"
);

// Load app AFTER environment variables
const app = require("./app");

const PORT = process.env.PORT || 3000;

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  if (!process.env.DATABASE) {
    throw new Error("DATABASE environment variable is not set");
  }

  await mongoose.connect(process.env.DATABASE);

  isConnected = true;
  console.log("✅ MongoDB connected successfully");
};

// Local server
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("❌ Database connection failed:", error);
      process.exit(1);
    });
}

// Vercel serverless
module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("❌ Server error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};