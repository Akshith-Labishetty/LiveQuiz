const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },  // 4 options
  correct: { type: Number, required: true },    // index 1-4
  title: { type: String, default: "General Quiz" },
  subject: { type: String, default: "General" }
});

module.exports = mongoose.model("Quiz", quizSchema);
