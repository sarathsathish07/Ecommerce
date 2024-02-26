const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    balance:{
        type:Number,
        require:true
    }
})

module.exports = mongoose.model('Wallet',walletSchema)