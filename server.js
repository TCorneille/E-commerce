const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

const app = require("./app");

const PORT = process.env.PORT || 3000;

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  if (!process.env.DATABASE) {
    throw new Error("DATABASE environment variable is missing");
  }

  try {
    await mongoose.connect(process.env.DATABASE);

    isConnected = true;

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
};

// Local development
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("❌ Server startup failed:", error);
      process.exit(1);
    });
}

// Vercel
// module.exports = async (req, res) => {
//   try {
//     await connectDB();

//     return app(req, res);
//   } catch (error) {
//     console.error("❌ Vercel server error:", error);

//     return res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// };