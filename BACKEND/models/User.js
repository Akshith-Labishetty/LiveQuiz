  const mongoose = require("mongoose");

  const userSchema = new mongoose.Schema({
    rid: { type: String, unique: true, required: true }, // Student/Teacher ID
    name: {type:String,requireed:true},
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher"], required: true}
  });

  module.exports = mongoose.model("User", userSchema);
  