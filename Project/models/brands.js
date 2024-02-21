const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Brand", brandSchema);
