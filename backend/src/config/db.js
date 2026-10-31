const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL is missing in .env");
    }
    const URL = process.env.MONGO_URL;

    await mongoose.connect(URL);
    console.log("MongoDB Connected Successfully!");
  } catch (err) {
    console.error("❌MongoDB Connection Failed:", err.message);
    throw err;
  }
};

module.exports = dbConnect;
