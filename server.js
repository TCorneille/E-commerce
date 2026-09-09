const dotenv = require('dotenv');
// 1. Load env first. Ensure the filename matches your actual file (config.env vs .env)
dotenv.config({ path: './config.env' }); 


console.log("🔑 API Key Loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");
const mongoose = require('mongoose');
// 2. Import app ONLY after dotenv has loaded the keys
const app = require('./app');

// const DB = process.env.DATABASE.replace(
//   "<DATABASE_PASSWORD>",
//   process.env.DATABASE_PASSWORD
// );


mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log('✅ DB connection successful!'))
  .catch(err => console.error('❌ Connection error:', err));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});