const dotenv = require("dotenv");
dotenv.config({ path: './config.env' }); 

const mongoose = require("mongoose");
const app = require("./app");

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return;
  }

  console.log("DATABASE:", process.env.DATABASE ? "FOUND" : "MISSING");

  if (!process.env.DATABASE) {
    throw new Error("DATABASE environment variable is missing");
  }

  await mongoose.connect(process.env.DATABASE);

  isConnected = true;

  console.log("✅ MongoDB connected");
}

module.exports = async (req, res) => {
  try {
    await connectDB();

    console.log("✅ Calling Express app");

    return app(req, res);
  } catch (error) {
    console.error("❌ ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

if (require.main === module) {
  connectDB()
    .then(() => {
      const PORT = process.env.PORT || 3000;

      app.listen(PORT, () => {
        console.log(`🚀 Server running on ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("❌ Startup error:", error);
      process.exit(1);
    });
}