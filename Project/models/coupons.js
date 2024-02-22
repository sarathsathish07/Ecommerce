const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  couponCode:{
    type:String,
    unique:true
  },
  description:{
    type:String
  },
usersUsed:[{
  type: mongoose.Schema.Types.ObjectId,
  ref:'users'
}],
discountPercentage:{
  type: Number,
  min: 0,
  max: 100
},
maxDiscountAmount:{
  type: Number,
  min: 0
},
minAmount:{
  type: Number,
  min:0
},
status:{
  type: String,
  default: 'Active'
},
expiryDate:{
  type: Date
},
isListed:{
  type: Boolean,
  default: true
},
isExpired:{
  type: Boolean,
  default: true
}
});

module.exports = mongoose.model("Coupon", couponSchema);