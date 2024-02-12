const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productTitle: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    require: true,
  },
  quantity: {
    type: Number,
  },
  images: [{ type: String }],

  description: {
    type: String,
  },
  price: {
    type: Number,
  },
  stock: {  
    type: Number,
    default: 0, 
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  isBestSeller: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isHotSale: { type: Boolean, default: false },
  time: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);
