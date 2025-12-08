const mongoose = require("mongoose");

// 🔥 Replace with your MongoDB string
const MONGO_URI = "mongodb://127.0.0.1:27017/livequiz";

function connectDB() {
  mongoose
    .connect(MONGO_URI)
    .then((connection) => {
      const dbName = connection.connection.db.databaseName;
      console.log("====================================");
      console.log("   ✅ MongoDB Connected Successfully");
      console.log("   ✅ Database Name:", dbName);
      console.log("====================================");
    })
    .catch((err) => {
      console.log("====================================");
      console.log("   ❌ MongoDB Connection Failed");
      console.log("   Error:", err.message);
      console.log("====================================");
    });
}

module.exports = connectDB;
